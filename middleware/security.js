const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// --- CSRF -------------------------------------------------------------
// Every session gets a random token. Forms send it back as a hidden "_csrf"
// field; JavaScript requests send it in the "x-csrf-token" header.

function csrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (tokensMatch(sent, req.session.csrfToken)) return next();

  if (req.get('accept')?.includes('application/json')) {
    return res.status(403).json({ success: false, message: 'Your session expired. Please refresh the page.' });
  }
  return res.status(403).render('pages/error', {
    title: 'Session expired',
    status: 403,
    message: 'Your form expired for security reasons. Please go back, refresh the page and try again.',
  });
}

// Multipart forms are parsed by multer inside the route, so CSRF is checked there.
// The payment webhook comes from PayHero, not a browser, and has its own check.
function verifyCsrfUnlessExempt(req, res, next) {
  if (req.is('multipart/form-data')) return next();
  if (req.path === '/payments/callback') return next();
  return verifyCsrf(req, res, next);
}

// --- Rate limits ------------------------------------------------------

function limiter(windowMinutes, max, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      if (req.get('accept')?.includes('application/json')) {
        return res.status(429).json({ success: false, message });
      }
      return res.status(429).render('pages/error', { title: 'Slow down', status: 429, message });
    },
  });
}

const loginLimiter = limiter(15, 10, 'Too many login attempts. Please wait 15 minutes and try again.');
const formLimiter = limiter(60, 20, 'Too many messages sent. Please try again in an hour.');
const aiLimiter = limiter(60, 30, 'AI writing limit reached. Please try again later.');

module.exports = { tokensMatch, csrfToken, verifyCsrf, verifyCsrfUnlessExempt, loginLimiter, formLimiter, aiLimiter };
