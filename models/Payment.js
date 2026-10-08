const db = require('../config/db');
const { PACKAGES } = require('../lib/constants');

const Payment = {
  async create({ user_id, property_id, packageKey, phone_number, external_reference }) {
    const pkg = PACKAGES[packageKey];
    const [result] = await db.query(
      `INSERT INTO payments (user_id, property_id, amount, package_name, phone_number, external_reference, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, property_id, pkg.price, pkg.name, phone_number, external_reference]
    );
    return result.insertId;
  },

  async findByReference(externalReference) {
    const [rows] = await db.query('SELECT * FROM payments WHERE external_reference = ?', [externalReference]);
    return rows[0] || null;
  },

  async setPayheroReference(id, reference) {
    await db.query('UPDATE payments SET payhero_reference = ? WHERE id = ?', [reference, id]);
  },

  // Marks a payment paid and features the property. Safe to call twice:
  // the row lock and status check stop a second promotion being created.
  async complete(id, { mpesaCode, raw }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [[payment]] = await conn.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [id]);
      if (!payment || payment.status === 'completed') {
        await conn.rollback();
        return false;
      }

      await conn.query(
        `UPDATE payments SET status = 'completed', transaction_reference = ?, callback_data = ?, paid_at = NOW() WHERE id = ?`,
        [mpesaCode || null, raw ? JSON.stringify(raw) : null, id]
      );

      const pkg = Object.values(PACKAGES).find((p) => p.name === payment.package_name) || PACKAGES.basic;
      if (payment.property_id) {
        await conn.query(
          `INSERT INTO property_promotions (property_id, payment_id, package_name, start_date, end_date, status)
           VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')`,
          [payment.property_id, payment.id, payment.package_name, pkg.days]
        );
        // Extend from the later of now or the current end date, so stacking packages adds time.
        await conn.query(
          `UPDATE properties SET is_featured = 1,
             featured_until = DATE_ADD(GREATEST(NOW(), COALESCE(featured_until, NOW())), INTERVAL ? DAY)
           WHERE id = ?`,
          [pkg.days, payment.property_id]
        );
      }
      await conn.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, 'Payment received', ?, 'payment')`,
        [payment.user_id, `We received KSh ${payment.amount}. Your listing is featured for ${pkg.days} days.`]
      );

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async fail(id, raw) {
    await db.query(`UPDATE payments SET status = 'failed', callback_data = ? WHERE id = ? AND status = 'pending'`, [
      raw ? JSON.stringify(raw) : null, id,
    ]);
  },

  // userId = null returns every payment (admin view).
  async list(userId = null, limit = 100) {
    const [rows] = await db.query(
      `SELECT pay.*, p.title AS property_title, u.full_name AS user_name
       FROM payments pay
       LEFT JOIN properties p ON p.id = pay.property_id
       JOIN users u ON u.id = pay.user_id
       WHERE (? IS NULL OR pay.user_id = ?)
       ORDER BY pay.created_at DESC LIMIT ?`,
      [userId, userId, limit]
    );
    return rows;
  },
};

module.exports = Payment;
