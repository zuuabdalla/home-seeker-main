const env = require('./config/env');
const path = require('path');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');

const db = require('./config/db');
const helpers = require('./lib/viewHelpers');
const Notification = require('./models/Notification');
const { csrfToken, verifyCsrfUnlessExempt } = require('./middleware/security');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
Object.assign(app.locals, helpers);

// --- Security headers ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
        connectSrc: ["'self'", 'https://nominatim.openstreetmap.org'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: env.isProduction ? [] : null,
      },
    },
  })
);

// --- Body parsing & static files ---
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: env.isProduction ? '7d' : 0 }));

// --- Sessions (stored in MySQL so they survive restarts) ---
app.use(
  session({
    name: 'hf.sid',
    secret: env.sessionSecret,
    store: new MySQLStore({ createDatabaseTable: true, clearExpired: true }, db),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// --- Flash messages: req.flash('success', 'Saved!') shows once on the next page ---
app.use((req, res, next) => {
  req.flash = (type, message) => {
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ type, message });
  };
  res.locals.flash = req.session.flash || [];
  delete req.session.flash;
  next();
});

// --- Values every template can use ---
app.use(async (req, res, next) => {
  const user = req.session.user || null;
  res.locals.currentUser = user;
  res.locals.currentPath = req.path;
  res.locals.savedIds = req.session.saved || [];
  res.locals.unreadCount = 0;
  if (user && user.role !== 'admin' && req.path.startsWith('/landlord')) {
    res.locals.unreadCount = await Notification.unreadCount(user.id).catch(() => 0);
  }
  next();
});

// CSRF runs after the values above, so its error page can render the header.
app.use(csrfToken);
app.use(verifyCsrfUnlessExempt);

// --- Routes ---
app.use(require('./routes/publicRoutes'));
app.use(require('./routes/authRoutes'));
app.use('/landlord', require('./routes/landlordRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use(require('./routes/paymentRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// --- 404 & errors ---
app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'Page not found',
    status: 404,
    message: "We couldn't find that page. It may have been moved or the listing removed.",
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  // The failure may have happened before the template values were set.
  res.locals = { flash: [], currentUser: null, currentPath: req.path, savedIds: [], unreadCount: 0, ...res.locals };
  res.status(500).render('pages/error', {
    title: 'Something went wrong',
    status: 500,
    message: 'Something went wrong on our side. Please try again in a moment.',
  });
});

module.exports = app;
