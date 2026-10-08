// Small formatting helpers available in every EJS template.
const { AMENITIES, PROPERTY_TYPES, COUNTIES, STATUSES, PACKAGES } = require('./constants');

const FALLBACK_IMAGE = '/img/placeholder.svg';

function kes(amount) {
  return 'KSh ' + Math.round(Number(amount) || 0).toLocaleString('en-KE');
}

// "fake_listing" -> "Fake listing"
function label(value) {
  if (!value) return '';
  const text = String(value).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function date(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function time(value) {
  return value ? String(value).slice(0, 5) : '';
}

function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

function initials(name) {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Colour family for a status badge.
function tone(status) {
  const map = {
    approved: 'green', completed: 'green', confirmed: 'green', resolved: 'green', active: 'green', available: 'green', responded: 'green',
    pending: 'amber', new: 'amber', investigating: 'amber', available_soon: 'amber', queued: 'amber',
    rejected: 'red', failed: 'red', cancelled: 'red', occupied: 'red',
  };
  return map[status] || 'gray';
}

function bedsLabel(n) {
  return Number(n) === 0 ? 'Studio' : `${n} bed${Number(n) === 1 ? '' : 's'}`;
}

// Build a URL to the listings page keeping the current filters, with overrides.
function queryWith(current, overrides) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '?';
}

module.exports = {
  kes, label, date, time, timeAgo, initials, tone, bedsLabel, queryWith,
  FALLBACK_IMAGE, AMENITIES, PROPERTY_TYPES, COUNTIES, STATUSES, PACKAGES,
};
