const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Compared against when an email is unknown, so failed logins take the same time either way.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const PUBLIC_COLUMNS = 'id, full_name, email, phone, role, profile_image, bio, is_verified, is_active, created_at';

const User = {
  async findById(id) {
    const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  // Includes the password hash: only use for login checks.
  async findByEmailWithPassword(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [String(email || '').trim().toLowerCase()]);
    return rows[0] || null;
  },

  async emailOrPhoneTaken(email, phone, exceptId = 0) {
    const [rows] = await db.query('SELECT id FROM users WHERE (email = ? OR phone = ?) AND id <> ? LIMIT 1', [
      email, phone, exceptId,
    ]);
    return rows.length > 0;
  },

  async create({ full_name, email, phone, password, role }) {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone, hash, role]
    );
    return this.findById(result.insertId);
  },

  async updateProfile(id, { full_name, phone, bio, profile_image }) {
    const fields = { full_name, phone, bio };
    if (profile_image) fields.profile_image = profile_image;
    await db.query('UPDATE users SET ? WHERE id = ?', [fields, id]);
    return this.findById(id);
  },

  async setPassword(id, password) {
    await db.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(password, 12), id]);
  },

  async checkPassword(plain, hash) {
    if (typeof plain !== 'string' || !plain) return false;
    const ok = await bcrypt.compare(plain, hash || DUMMY_HASH);
    return Boolean(hash) && ok;
  },

  async list({ role = null, q = null } = {}) {
    const like = q ? `%${q}%` : null;
    const [rows] = await db.query(
      `SELECT ${PUBLIC_COLUMNS},
              (SELECT COUNT(*) FROM properties WHERE landlord_id = users.id) AS listings
       FROM users
       WHERE (? IS NULL OR role = ?) AND (? IS NULL OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?)
       ORDER BY created_at DESC LIMIT 200`,
      [role, role, like, like, like, like]
    );
    return rows;
  },

  async setFlag(id, column, value) {
    if (!['is_active', 'is_verified'].includes(column)) throw new Error('Invalid flag');
    await db.query(`UPDATE users SET ${column} = ? WHERE id = ? AND role <> 'admin'`, [value ? 1 : 0, id]);
  },
};

module.exports = User;
