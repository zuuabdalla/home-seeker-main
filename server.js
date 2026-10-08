const env = require('./config/env');
const app = require('./app');
const db = require('./config/db');
const Promotion = require('./models/Promotion');

async function start() {
  try {
    await db.query('SELECT 1');
    console.log('Connected to MySQL.');
  } catch (err) {
    console.error(`Cannot connect to MySQL: ${err.message}`);
    console.error('Check DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in your .env file.');
    process.exit(1);
  }

  // Turn off featured badges whose promotion has ended, now and every hour.
  const expire = () => Promotion.expireOld().catch((err) => console.error('Promotion expiry failed:', err.message));
  expire();
  setInterval(expire, 60 * 60 * 1000).unref();

  app.listen(env.port, () => {
    console.log(`HomeFinder running at ${env.appUrl}`);
  });
}

start();
