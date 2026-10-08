const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const Promotion = require('../models/Promotion');
const { STATUSES } = require('../lib/constants');
const { removeUploads, uploadedUrls } = require('../middleware/uploadMiddleware');
const { positiveId } = require('../lib/validate');

// Admins may manage any listing; everyone else only their own.
const ownerScope = (user) => (user.role === 'admin' ? null : user.id);

exports.dashboard = async (req, res) => {
  const id = req.session.user.id;
  const [stats, listings, inquiries, bookings] = await Promise.all([
    Property.landlordStats(id),
    Property.search({ landlord_id: id, status: 'all' }, { sort: 'recent', limit: 4 }),
    Inquiry.list(id, 5),
    Booking.list(id, 5),
  ]);
  res.render('landlord/dashboard', {
    title: 'Dashboard',
    stats,
    listings: listings.rows,
    inquiries,
    bookings,
  });
};

exports.listings = async (req, res) => {
  const { rows } = await Property.search({ landlord_id: req.session.user.id, status: 'all' }, { sort: 'recent', limit: 200 });
  res.render('landlord/listings', { title: 'My listings', properties: rows });
};

exports.newForm = (req, res) => {
  res.render('landlord/property-form', { title: 'Add a listing', property: { amenityList: [], details: {}, images: [] } });
};

// Re-shows the form with the user's input after a validation error.
function formWithErrors(res, title, data, errors, images = []) {
  const property = { ...data, amenityList: Object.keys(data.amenities).filter((k) => data.amenities[k]), images };
  return res.status(400).render('landlord/property-form', { title, property, errors });
}

exports.create = async (req, res) => {
  const images = uploadedUrls(req);
  const { errors, data } = Property.clean(req.body);
  if (!images.length) errors.push('Add at least one photo. Listings with photos get far more inquiries.');
  if (errors.length) {
    removeUploads(images);
    return formWithErrors(res, 'Add a listing', data, errors);
  }

  await Property.create(req.session.user.id, data, images);
  req.flash('success', 'Listing submitted! Our team reviews new listings within 24 hours.');
  res.redirect('/landlord/listings');
};

async function loadOwned(req, res) {
  const id = positiveId(req.params.id);
  const property = id && (await Property.findWithDetails(id));
  const scope = ownerScope(req.session.user);
  if (!property || (scope && property.landlord_id !== scope)) {
    res.status(404).render('pages/error', { title: 'Not found', status: 404, message: 'We could not find that listing.' });
    return null;
  }
  return property;
}

exports.editForm = async (req, res) => {
  const property = await loadOwned(req, res);
  if (property) res.render('landlord/property-form', { title: 'Edit listing', property });
};

exports.update = async (req, res) => {
  const newImages = uploadedUrls(req);
  const property = await loadOwned(req, res);
  if (!property) return removeUploads(newImages);

  const { errors, data } = Property.clean(req.body);
  const removeIds = [].concat(req.body.remove_images || []).map(positiveId).filter(Boolean);
  const remaining = property.images.filter((img) => !removeIds.includes(img.id)).length + newImages.length;
  if (remaining === 0) errors.push('Keep at least one photo on the listing.');
  if (errors.length) {
    removeUploads(newImages);
    return formWithErrors(res, 'Edit listing', { ...data, id: property.id }, errors, property.images);
  }

  const result = await Property.update(property.id, ownerScope(req.session.user), data, newImages, removeIds);
  removeUploads(result.removed);
  req.flash('success', req.session.user.role === 'admin'
    ? 'Listing updated.'
    : 'Changes saved. The listing will be live again once our team re-checks it.');
  res.redirect('/landlord/listings');
};

exports.remove = async (req, res) => {
  const images = await Property.remove(positiveId(req.params.id), ownerScope(req.session.user));
  if (images) {
    removeUploads(images);
    req.flash('success', 'Listing deleted.');
  } else {
    req.flash('error', 'We could not find that listing.');
  }
  res.redirect('/landlord/listings');
};

exports.inquiries = async (req, res) => {
  const inquiries = await Inquiry.list(req.session.user.id);
  res.render('landlord/inquiries', { title: 'Inquiries', inquiries });
};

exports.setInquiryStatus = async (req, res) => {
  if (STATUSES.inquiry.includes(req.body.status)) {
    await Inquiry.setStatus(positiveId(req.params.id), ownerScope(req.session.user), req.body.status);
  }
  res.redirect('/landlord/inquiries');
};

exports.bookings = async (req, res) => {
  const bookings = await Booking.list(req.session.user.id);
  res.render('landlord/bookings', { title: 'Viewings', bookings });
};

exports.setBookingStatus = async (req, res) => {
  if (STATUSES.booking.includes(req.body.status)) {
    await Booking.setStatus(positiveId(req.params.id), ownerScope(req.session.user), req.body.status);
    req.flash('success', `Viewing marked as ${req.body.status}.`);
  }
  res.redirect('/landlord/bookings');
};

exports.notifications = async (req, res) => {
  const notifications = await Notification.list(req.session.user.id);
  res.render('landlord/notifications', { title: 'Notifications', notifications });
};

exports.markNotificationsRead = async (req, res) => {
  await Notification.markRead(req.session.user.id, positiveId(req.params.id));
  res.redirect('/landlord/notifications');
};

exports.promote = async (req, res) => {
  const id = req.session.user.id;
  const [live, promotions, payments] = await Promise.all([
    Property.search({ landlord_id: id }, { limit: 200 }),
    Promotion.listForLandlord(id),
    Payment.list(id, 50),
  ]);
  res.render('landlord/promote', {
    title: 'Promote a listing',
    properties: live.rows,
    promotions,
    payments,
    selected: positiveId(req.query.property),
  });
};
