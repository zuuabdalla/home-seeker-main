const db = require('../config/db');
const { AMENITIES, PROPERTY_TYPES, COUNTIES, STATUSES } = require('../lib/constants');

const AMENITY_KEYS = Object.keys(AMENITIES);
const LIST_COLUMNS = `
  p.*, u.full_name AS landlord_name,
  (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS primary_image`;
const SORTS = {
  newest: 'p.is_featured DESC, p.created_at DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  popular: 'p.views DESC',
  recent: 'p.created_at DESC',
};

// Turns search filters into a WHERE clause. Every value goes through "?" placeholders.
function buildFilters(f = {}) {
  const where = [];
  const values = [];
  let join = '';

  if (f.status !== 'all') {
    where.push('p.verification_status = ?');
    values.push(f.status || 'approved');
  }
  if (f.landlord_id) {
    where.push('p.landlord_id = ?');
    values.push(f.landlord_id);
  }
  if (f.q) {
    const like = `%${f.q}%`;
    where.push('(p.title LIKE ? OR p.town LIKE ? OR p.estate LIKE ? OR p.county LIKE ?)');
    values.push(like, like, like, like);
  }
  if (f.county) {
    where.push('p.county = ?');
    values.push(f.county);
  }
  if (PROPERTY_TYPES.includes(f.type)) {
    where.push('p.property_type = ?');
    values.push(f.type);
  }
  if (['rent', 'sale'].includes(f.listing)) {
    where.push('p.listing_type = ?');
    values.push(f.listing);
  }
  if (Number(f.min_price) > 0) {
    where.push('p.price >= ?');
    values.push(Number(f.min_price));
  }
  if (Number(f.max_price) > 0) {
    where.push('p.price <= ?');
    values.push(Number(f.max_price));
  }
  if (f.beds !== undefined && f.beds !== '') {
    if (f.beds === '4+') where.push('p.bedrooms >= 4');
    else {
      where.push('p.bedrooms = ?');
      values.push(Number(f.beds));
    }
  }
  if (f.furnished === '1') where.push('p.furnished = 1');
  if (AMENITY_KEYS.includes(f.amenity)) {
    join = 'JOIN property_amenities pa ON pa.property_id = p.id';
    where.push(`pa.${f.amenity} = 1`); // safe: checked against the fixed list above
  }

  return { join, where: where.length ? `WHERE ${where.join(' AND ')}` : '', values };
}

// Checks and normalises form input. Returns { errors, data }.
function clean(body) {
  const errors = [];
  const text = (v) => (typeof v === 'string' ? v.trim() : '');
  const int = (v, min = 0) => Math.max(min, parseInt(v, 10) || 0);
  const num = (v) => (v === '' || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

  const data = {
    title: text(body.title),
    description: text(body.description),
    property_type: text(body.property_type).toLowerCase(),
    listing_type: body.listing_type === 'sale' ? 'sale' : 'rent',
    price: num(body.price),
    bedrooms: int(body.bedrooms),
    bathrooms: int(body.bathrooms),
    property_size: num(body.property_size),
    furnished: body.furnished === '1' ? 1 : 0,
    county: text(body.county),
    town: text(body.town),
    estate: text(body.estate) || null,
    address: text(body.address) || null,
    latitude: num(body.latitude),
    longitude: num(body.longitude),
    availability_status: STATUSES.availability.includes(body.availability_status) ? body.availability_status : 'available',
    available_from: /^\d{4}-\d{2}-\d{2}$/.test(body.available_from || '') ? body.available_from : null,
  };

  const chosen = [].concat(body.amenities || []);
  data.amenities = Object.fromEntries(AMENITY_KEYS.map((key) => [key, chosen.includes(key) ? 1 : 0]));

  data.details = {
    pets_allowed: body.pets_allowed === '1' ? 1 : 0,
    suitable_for_families: body.suitable_for_families === '1' ? 1 : 0,
    suitable_for_students: body.suitable_for_students === '1' ? 1 : 0,
    suitable_for_professionals: body.suitable_for_professionals === '1' ? 1 : 0,
    parking_spaces: int(body.parking_spaces),
    minimum_rental_period: int(body.minimum_rental_period, 1),
    house_rules: text(body.house_rules) || null,
  };

  if (data.title.length < 10 || data.title.length > 200) errors.push('Give the listing a title between 10 and 200 characters.');
  if (data.description.length < 50) errors.push('Write a description of at least 50 characters so seekers know what to expect.');
  if (!PROPERTY_TYPES.includes(data.property_type)) errors.push('Choose a property type.');
  if (!data.price || data.price <= 0) errors.push('Enter a valid price.');
  if (!COUNTIES.includes(data.county)) errors.push('Choose a county.');
  if (!data.town) errors.push('Enter the town or area.');
  if (data.latitude !== null && (data.latitude < -5 || data.latitude > 5.5)) data.latitude = null;
  if (data.longitude !== null && (data.longitude < 33.5 || data.longitude > 42)) data.longitude = null;

  return { errors, data };
}

const PROPERTY_COLUMNS = [
  'title', 'description', 'property_type', 'listing_type', 'price', 'bedrooms', 'bathrooms', 'property_size',
  'furnished', 'county', 'town', 'estate', 'address', 'latitude', 'longitude', 'availability_status', 'available_from',
];

async function saveExtras(conn, propertyId, data) {
  // One row of amenities and one of details per property: replace, never duplicate.
  await conn.query('DELETE FROM property_amenities WHERE property_id = ?', [propertyId]);
  await conn.query('INSERT INTO property_amenities SET ?', [{ property_id: propertyId, ...data.amenities }]);
  await conn.query('DELETE FROM property_details WHERE property_id = ?', [propertyId]);
  await conn.query('INSERT INTO property_details SET ?', [{ property_id: propertyId, ...data.details }]);
}

async function inTransaction(work) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const Property = {
  clean,

  async search(filters = {}, { sort = 'newest', limit = 12, offset = 0 } = {}) {
    const { join, where, values } = buildFilters(filters);
    const [rows] = await db.query(
      `SELECT ${LIST_COLUMNS} FROM properties p JOIN users u ON u.id = p.landlord_id ${join} ${where}
       ORDER BY ${SORTS[sort] || SORTS.newest} LIMIT ? OFFSET ?`,
      [...values, Number(limit), Number(offset)]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM properties p ${join} ${where}`, values);
    return { rows, total };
  },

  async featured(limit = 6) {
    const [rows] = await db.query(
      `SELECT ${LIST_COLUMNS} FROM properties p JOIN users u ON u.id = p.landlord_id
       WHERE p.verification_status = 'approved' AND p.is_featured = 1
       ORDER BY p.views DESC LIMIT ?`,
      [limit]
    );
    return rows;
  },

  async findByIds(ids) {
    if (!ids.length) return [];
    const [rows] = await db.query(
      `SELECT ${LIST_COLUMNS} FROM properties p JOIN users u ON u.id = p.landlord_id
       WHERE p.id IN (?) AND p.verification_status = 'approved'`,
      [ids]
    );
    return rows;
  },

  async similar(property, limit = 3) {
    const [rows] = await db.query(
      `SELECT ${LIST_COLUMNS} FROM properties p JOIN users u ON u.id = p.landlord_id
       WHERE p.verification_status = 'approved' AND p.id <> ? AND (p.county = ? OR p.property_type = ?)
       ORDER BY (p.county = ?) DESC, ABS(p.price - ?) ASC LIMIT ?`,
      [property.id, property.county, property.property_type, property.county, property.price, limit]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM properties WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Full listing with landlord contact, images, amenities and details.
  async findWithDetails(id) {
    const [rows] = await db.query(
      `SELECT p.*, u.full_name AS landlord_name, u.phone AS landlord_phone, u.email AS landlord_email,
              u.profile_image AS landlord_avatar, u.role AS landlord_role, u.is_verified AS landlord_verified,
              u.created_at AS landlord_since
       FROM properties p JOIN users u ON u.id = p.landlord_id WHERE p.id = ?`,
      [id]
    );
    const property = rows[0];
    if (!property) return null;

    const [images] = await db.query(
      'SELECT id, image_url, is_primary FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, id ASC',
      [id]
    );
    const [[amenities]] = await db.query('SELECT * FROM property_amenities WHERE property_id = ? LIMIT 1', [id]);
    const [[details]] = await db.query('SELECT * FROM property_details WHERE property_id = ? LIMIT 1', [id]);

    property.images = images;
    property.amenityList = AMENITY_KEYS.filter((key) => amenities && amenities[key]);
    property.details = details || {};
    return property;
  },

  async create(landlordId, data, imageUrls) {
    return inTransaction(async (conn) => {
      const row = { landlord_id: landlordId, verification_status: 'pending' };
      for (const col of PROPERTY_COLUMNS) row[col] = data[col];
      const [result] = await conn.query('INSERT INTO properties SET ?', [row]);
      const id = result.insertId;

      await saveExtras(conn, id, data);
      if (imageUrls.length) {
        await conn.query('INSERT INTO property_images (property_id, image_url, is_primary) VALUES ?', [
          imageUrls.map((url, i) => [id, url, i === 0 ? 1 : 0]),
        ]);
      }
      return id;
    });
  },

  // ownerId = null lets an admin edit any listing. Edited listings go back to review.
  // Returns the URLs of removed images so the caller can delete the files.
  async update(id, ownerId, data, newImageUrls = [], removeImageIds = []) {
    return inTransaction(async (conn) => {
      const [owned] = await conn.query(
        'SELECT id FROM properties WHERE id = ? AND (? IS NULL OR landlord_id = ?) FOR UPDATE',
        [id, ownerId, ownerId]
      );
      if (!owned.length) return null;

      const row = {};
      for (const col of PROPERTY_COLUMNS) row[col] = data[col];
      if (ownerId) Object.assign(row, { verification_status: 'pending', rejection_reason: null });
      await conn.query('UPDATE properties SET ? WHERE id = ?', [row, id]);
      await saveExtras(conn, id, data);

      let removed = [];
      if (removeImageIds.length) {
        const [imgs] = await conn.query(
          'SELECT image_url FROM property_images WHERE property_id = ? AND id IN (?)',
          [id, removeImageIds]
        );
        removed = imgs.map((img) => img.image_url);
        await conn.query('DELETE FROM property_images WHERE property_id = ? AND id IN (?)', [id, removeImageIds]);
      }
      if (newImageUrls.length) {
        await conn.query('INSERT INTO property_images (property_id, image_url, is_primary) VALUES ?', [
          newImageUrls.map((url) => [id, url, 0]),
        ]);
      }
      // If the cover photo was removed, promote the oldest remaining image.
      const [[first]] = await conn.query(
        'SELECT id, is_primary FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1',
        [id]
      );
      if (first && !first.is_primary) {
        await conn.query('UPDATE property_images SET is_primary = 1 WHERE id = ?', [first.id]);
      }
      return { removed };
    });
  },

  // Returns the image URLs of the deleted listing (empty if nothing was deleted).
  async remove(id, ownerId) {
    const [imgs] = await db.query(
      `SELECT i.image_url FROM property_images i JOIN properties p ON p.id = i.property_id
       WHERE p.id = ? AND (? IS NULL OR p.landlord_id = ?)`,
      [id, ownerId, ownerId]
    );
    const [result] = await db.query('DELETE FROM properties WHERE id = ? AND (? IS NULL OR landlord_id = ?)', [
      id, ownerId, ownerId,
    ]);
    return result.affectedRows ? imgs.map((img) => img.image_url) : null;
  },

  async incrementViews(id) {
    await db.query('UPDATE properties SET views = views + 1 WHERE id = ?', [id]);
  },

  async setVerification(id, status, reason = null) {
    await db.query('UPDATE properties SET verification_status = ?, rejection_reason = ? WHERE id = ?', [status, reason, id]);
    return this.findById(id);
  },

  async landlordStats(landlordId) {
    const [[row]] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM properties WHERE landlord_id = ?) AS listings,
        (SELECT COUNT(*) FROM properties WHERE landlord_id = ? AND verification_status = 'approved') AS live,
        (SELECT COUNT(*) FROM properties WHERE landlord_id = ? AND verification_status = 'pending') AS pending,
        (SELECT COALESCE(SUM(views), 0) FROM properties WHERE landlord_id = ?) AS views,
        (SELECT COUNT(*) FROM inquiries WHERE landlord_id = ? AND status = 'new') AS newInquiries,
        (SELECT COUNT(*) FROM viewing_bookings WHERE landlord_id = ? AND status = 'pending') AS pendingViewings`,
      [landlordId, landlordId, landlordId, landlordId, landlordId, landlordId]
    );
    return row;
  },

  async adminStats() {
    const [[row]] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE role <> 'admin') AS landlords,
        (SELECT COUNT(*) FROM properties) AS listings,
        (SELECT COUNT(*) FROM properties WHERE verification_status = 'pending') AS pending,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending') AS reports,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') AS revenue,
        (SELECT COUNT(*) FROM inquiries) AS inquiries,
        (SELECT COUNT(*) FROM viewing_bookings) AS bookings,
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') AS messages`
    );
    return row;
  },
};

module.exports = Property;
