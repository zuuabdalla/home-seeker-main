const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const ContactMessage = require('../models/ContactMessage');
const { STATUSES } = require('../lib/constants');
const { text, isEmail, isPhone, isFutureDate, positiveId } = require('../lib/validate');

const PAGE_SIZE = 12;

exports.home = async (req, res) => {
  const [featured, latest] = await Promise.all([
    Property.featured(6),
    Property.search({}, { sort: 'newest', limit: 6 }),
  ]);
  res.render('pages/home', { title: 'Find a place you can call home', featured, latest: latest.rows });
};

exports.listings = async (req, res) => {
  const filters = {
    q: text(req.query.q, 100),
    county: text(req.query.county, 50),
    type: text(req.query.type, 20),
    listing: text(req.query.listing, 10),
    min_price: text(req.query.min_price, 12),
    max_price: text(req.query.max_price, 12),
    beds: text(req.query.beds, 3),
    furnished: req.query.furnished === '1' ? '1' : '',
    amenity: text(req.query.amenity, 30),
    sort: text(req.query.sort, 20),
  };
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { rows, total } = await Property.search(filters, {
    sort: filters.sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  res.render('properties/index', {
    title: 'Browse homes',
    properties: rows,
    total,
    filters,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
};

// Loads a listing that the current visitor is allowed to see, or renders 404.
async function loadVisibleProperty(req, res) {
  const id = positiveId(req.params.id);
  const property = id && (await Property.findWithDetails(id));
  const user = req.session.user;
  const canPreview = user && (user.role === 'admin' || user.id === property?.landlord_id);
  if (!property || (property.verification_status !== 'approved' && !canPreview)) {
    res.status(404).render('pages/error', {
      title: 'Listing not found',
      status: 404,
      message: 'This listing does not exist, or it is no longer available.',
    });
    return null;
  }
  return property;
}

exports.show = async (req, res) => {
  const property = await loadVisibleProperty(req, res);
  if (!property) return;

  // Count each visitor once per session.
  req.session.viewed = req.session.viewed || [];
  if (!req.session.viewed.includes(property.id)) {
    req.session.viewed.push(property.id);
    Property.incrementViews(property.id).catch(() => {});
  }

  res.render('properties/show', {
    title: property.title,
    property,
    similar: await Property.similar(property),
    isPreview: property.verification_status !== 'approved',
  });
};

// Contact forms on the listing page all share the same "find listing, check, save, notify" flow.
async function approvedListing(req, res) {
  const id = positiveId(req.params.id);
  const property = id && (await Property.findById(id));
  if (!property || property.verification_status !== 'approved') {
    req.flash('error', 'That listing is no longer available.');
    res.redirect('/properties');
    return null;
  }
  return property;
}

function seekerFields(body) {
  return {
    seeker_name: text(body.name, 100),
    seeker_phone: text(body.phone, 20),
    seeker_email: text(body.email, 150) || null,
  };
}

function seekerErrors(f) {
  const errors = [];
  if (f.seeker_name.length < 2) errors.push('your name');
  if (!isPhone(f.seeker_phone)) errors.push('a valid Kenyan phone number');
  if (f.seeker_email && !isEmail(f.seeker_email)) errors.push('a valid email (or leave it blank)');
  return errors;
}

exports.sendInquiry = async (req, res) => {
  const property = await approvedListing(req, res);
  if (!property) return;
  const back = `/properties/${property.id}#contact`;

  const fields = seekerFields(req.body);
  const message = text(req.body.message, 2000);
  const errors = seekerErrors(fields);
  if (message.length < 10) errors.push('a message of at least 10 characters');
  if (errors.length) {
    req.flash('error', `Please enter ${errors.join(', ')}.`);
    return res.redirect(back);
  }

  await Inquiry.create({
    property_id: property.id,
    landlord_id: property.landlord_id,
    ...fields,
    message,
    preferred_contact_method: STATUSES.contactMethod.includes(req.body.contact_method) ? req.body.contact_method : 'phone',
  });
  await Notification.create(property.landlord_id, 'New inquiry', `${fields.seeker_name} asked about "${property.title}".`, 'inquiry');

  req.flash('success', 'Message sent! The landlord will get back to you soon.');
  res.redirect(back);
};

exports.bookViewing = async (req, res) => {
  const property = await approvedListing(req, res);
  if (!property) return;
  const back = `/properties/${property.id}#contact`;

  const fields = seekerFields(req.body);
  const date = text(req.body.date, 10);
  const time = text(req.body.time, 5);
  const errors = seekerErrors(fields);
  if (!isFutureDate(date)) errors.push('a viewing date from today onwards');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.push('a viewing time');
  if (errors.length) {
    req.flash('error', `Please enter ${errors.join(', ')}.`);
    return res.redirect(back);
  }

  await Booking.create({
    property_id: property.id,
    landlord_id: property.landlord_id,
    ...fields,
    viewing_date: date,
    viewing_time: time,
    message: text(req.body.message, 1000) || null,
  });
  await Notification.create(
    property.landlord_id,
    'Viewing requested',
    `${fields.seeker_name} wants to view "${property.title}" on ${date} at ${time}.`,
    'booking'
  );

  req.flash('success', 'Viewing requested! The landlord will confirm by phone.');
  res.redirect(back);
};

exports.report = async (req, res) => {
  const property = await approvedListing(req, res);
  if (!property) return;

  const reason = STATUSES.reportReason.includes(req.body.reason) ? req.body.reason : null;
  if (!reason) {
    req.flash('error', 'Please choose a reason for the report.');
    return res.redirect(`/properties/${property.id}`);
  }
  await Report.create({
    property_id: property.id,
    reason,
    description: text(req.body.description, 1000) || null,
    reporter_name: text(req.body.name, 100) || null,
    reporter_phone: text(req.body.phone, 20) || null,
  });
  req.flash('success', 'Thank you. Our team will review this listing.');
  res.redirect(`/properties/${property.id}`);
};

// Saved homes live in the session, so visitors can save without an account.
exports.toggleSave = (req, res) => {
  const id = positiveId(req.params.id);
  const saved = new Set(req.session.saved || []);
  if (id) saved.has(id) ? saved.delete(id) : saved.add(id);
  req.session.saved = [...saved].slice(-100);

  if (req.get('accept')?.includes('application/json')) {
    return res.json({ saved: saved.has(id), count: req.session.saved.length });
  }
  res.redirect(req.get('referer') || `/properties/${id}`);
};

exports.saved = async (req, res) => {
  const properties = await Property.findByIds(req.session.saved || []);
  res.render('properties/saved', { title: 'Saved homes', properties });
};

exports.about = (req, res) => res.render('pages/about', { title: 'About us' });

exports.contactPage = (req, res) => res.render('pages/contact', { title: 'Contact us', form: {} });

exports.sendContact = async (req, res) => {
  const form = {
    name: text(req.body.name, 100),
    email: text(req.body.email, 150),
    phone: text(req.body.phone, 20) || null,
    subject: text(req.body.subject, 200) || null,
    message: text(req.body.message, 3000),
  };
  const errors = [];
  if (form.name.length < 2) errors.push('Please enter your name.');
  if (!isEmail(form.email)) errors.push('Please enter a valid email address.');
  if (form.message.length < 10) errors.push('Please write a message of at least 10 characters.');
  if (errors.length) {
    return res.status(400).render('pages/contact', { title: 'Contact us', form, errors });
  }

  await ContactMessage.create(form);
  req.flash('success', 'Thanks for reaching out! We reply within one working day.');
  res.redirect('/contact');
};
