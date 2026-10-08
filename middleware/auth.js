// Redirects anonymous visitors to the login page, remembering where they were going.
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

// Allows only the listed roles. Admins always pass.
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
    if (user.role === 'admin' || roles.includes(user.role)) return next();
    return res.status(403).render('pages/error', {
      title: 'Access denied',
      status: 403,
      message: 'You do not have permission to view this page.',
    });
  };
}

const requireLandlord = requireRole('landlord', 'agent');
const requireAdmin = requireRole('admin');

// Only accept same-site relative paths, so "next" cannot send users to another website.
function safeRedirectPath(next, fallback = '/') {
  if (typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

module.exports = { requireLogin, requireRole, requireLandlord, requireAdmin, safeRedirectPath };
