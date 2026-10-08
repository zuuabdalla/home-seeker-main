const db = require('../config/db');

const ContactMessage = {
  async create(data) {
    await db.query('INSERT INTO contact_messages SET ?', [data]);
  },

  async list() {
    const [rows] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200');
    return rows;
  },

  async setStatus(id, status) {
    await db.query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, id]);
  },
};

module.exports = ContactMessage;
