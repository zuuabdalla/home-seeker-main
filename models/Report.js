const db = require('../config/db');

const Report = {
  async create(data) {
    await db.query('INSERT INTO reports SET ?', [data]);
  },

  async list(status = null) {
    const [rows] = await db.query(
      `SELECT r.*, p.title AS property_title, u.full_name AS landlord_name,
              (SELECT COUNT(*) FROM reports r2 WHERE r2.property_id = r.property_id) AS times_reported
       FROM reports r
       JOIN properties p ON p.id = r.property_id
       JOIN users u ON u.id = p.landlord_id
       WHERE (? IS NULL OR r.status = ?)
       ORDER BY r.created_at DESC LIMIT 200`,
      [status, status]
    );
    return rows;
  },

  async setStatus(id, status, notes) {
    await db.query(
      `UPDATE reports SET status = ?, admin_notes = ?,
         resolved_at = IF(? IN ('resolved', 'dismissed'), NOW(), NULL)
       WHERE id = ?`,
      [status, notes || null, status, id]
    );
  },
};

module.exports = Report;
