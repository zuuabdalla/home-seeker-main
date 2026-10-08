// Tiny input checks shared by the public forms.

function text(value, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

// Accepts Kenyan numbers like 0712 345 678 or +254 712 345 678.
function isPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^(0|254)?(7|1)\d{8}$/.test(digits);
}

function isFutureDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value >= today;
}

function positiveId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = { text, isEmail, isPhone, isFutureDate, positiveId };
