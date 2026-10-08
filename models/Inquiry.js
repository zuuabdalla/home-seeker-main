const db = require('../config/db');

const Inquiry = {
  async create(data) {
    const [result] = await db.query('INSERT INTO inquiries SET ?', [data]);
    return result.insertId;
  },

  // landlordId = null returns every inquiry (admin view).
  async list(landlordId = null, limit = 100) {
    const [rows] = await db.query(
      `SELECT i.*, p.title AS property_title, u.full_name AS landlord_name
       FROM inquiries i
       JOIN properties p ON p.id = i.property_id
       JOIN users u ON u.id = i.landlord_id
       WHERE (? IS NULL OR i.landlord_id = ?)
       ORDER BY i.created_at DESC LIMIT ?`,
      [landlordId, landlordId, limit]
    );
    return rows;
  },

  async setStatus(id, landlordId, status) {
    const [result] = await db.query(
      'UPDATE inquiries SET status = ? WHERE id = ? AND (? IS NULL OR landlord_id = ?)',
      [status, id, landlordId, landlordId]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Inquiry;
