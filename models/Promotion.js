const db = require('../config/db');

const Promotion = {
  async listForLandlord(landlordId) {
    const [rows] = await db.query(
      `SELECT pp.*, p.title AS property_title
       FROM property_promotions pp JOIN properties p ON p.id = pp.property_id
       WHERE p.landlord_id = ? ORDER BY pp.created_at DESC LIMIT 50`,
      [landlordId]
    );
    return rows;
  },

  async expireOld() {
    await db.query("UPDATE property_promotions SET status = 'expired' WHERE status = 'active' AND end_date < NOW()");
    await db.query('UPDATE properties SET is_featured = 0 WHERE is_featured = 1 AND featured_until < NOW()');
  },
};

module.exports = Promotion;
