// Loads .env once and refuses to start production with unsafe settings.
require('dotenv').config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const required = ['SESSION_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production.');
  }
  if (process.env.PAYMENTS_SIMULATE === 'true') {
    throw new Error('PAYMENTS_SIMULATE cannot be enabled in production.');
  }
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-secret-change-me-in-production',
  appUrl: process.env.APP_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,
};
