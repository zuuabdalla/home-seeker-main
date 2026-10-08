const db = require('../config/db');

const Notification = {
  async create(userId, title, message, type = 'system') {
    await db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [
      userId, title, message, type,
    ]);
  },

  async list(userId, limit = 50) {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [
      userId, limit,
    ]);
    return rows;
  },

  async unreadCount(userId) {
    const [[row]] = await db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return row.n;
  },

  async markRead(userId, id = null) {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND (? IS NULL OR id = ?)', [userId, id, id]);
  },
};

module.exports = Notification;
