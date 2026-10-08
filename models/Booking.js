const db = require('../config/db');

const Booking = {
  async create(data) {
    const [result] = await db.query('INSERT INTO viewing_bookings SET ?', [data]);
    return result.insertId;
  },

  // landlordId = null returns every booking (admin view).
  async list(landlordId = null, limit = 100) {
    const [rows] = await db.query(
      `SELECT b.*, p.title AS property_title, p.town AS property_town, u.full_name AS landlord_name
       FROM viewing_bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN users u ON u.id = b.landlord_id
       WHERE (? IS NULL OR b.landlord_id = ?)
       ORDER BY b.viewing_date DESC, b.viewing_time DESC LIMIT ?`,
      [landlordId, landlordId, limit]
    );
    return rows;
  },

  async setStatus(id, landlordId, status) {
    const [result] = await db.query(
      'UPDATE viewing_bookings SET status = ? WHERE id = ? AND (? IS NULL OR landlord_id = ?)',
      [status, id, landlordId, landlordId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Booking;
