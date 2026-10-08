const Property = require('../models/Property');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const Inquiry = require('../models/Inquiry');
const Booking = require('../models/Booking');
const ContactMessage = require('../models/ContactMessage');
const Notification = require('../models/Notification');
const { STATUSES } = require('../lib/constants');
const { text, positiveId } = require('../lib/validate');

exports.dashboard = async (req, res) => {
  const [stats, pending, reports, payments] = await Promise.all([
    Property.adminStats(),
    Property.search({ status: 'pending' }, { sort: 'recent', limit: 5 }),
    Report.list('pending'),
    Payment.list(null, 5),
  ]);
  res.render('admin/dashboard', {
    title: 'Admin overview',
    stats,
    pending: pending.rows,
    reports: reports.slice(0, 5),
    payments,
  });
};

exports.properties = async (req, res) => {
  const status = STATUSES.verification.includes(req.query.status) ? req.query.status : 'all';
  const q = text(req.query.q, 100);
  const { rows } = await Property.search({ status, q }, { sort: 'recent', limit: 200 });
  res.render('admin/properties', { title: 'Listings', properties: rows, status, q });
};

exports.approve = async (req, res) => {
  const property = await Property.setVerification(positiveId(req.params.id), 'approved');
  if (property) {
    await Notification.create(property.landlord_id, 'Listing approved', `"${property.title}" is now live on HomeFinder.`, 'property');
    req.flash('success', `Approved "${property.title}".`);
  }
  res.redirect(req.get('referer') || '/admin/properties?status=pending');
};

exports.reject = async (req, res) => {
  const reason = text(req.body.reason, 500);
  if (reason.length < 5) {
    req.flash('error', 'Please give the landlord a short reason for the rejection.');
    return res.redirect(req.get('referer') || '/admin/properties?status=pending');
  }
  const property = await Property.setVerification(positiveId(req.params.id), 'rejected', reason);
  if (property) {
    await Notification.create(property.landlord_id, 'Listing needs changes', `"${property.title}" was not approved: ${reason}`, 'property');
    req.flash('success', `Rejected "${property.title}". The landlord has been told why.`);
  }
  res.redirect(req.get('referer') || '/admin/properties?status=pending');
};

exports.users = async (req, res) => {
  const role = ['landlord', 'agent', 'admin'].includes(req.query.role) ? req.query.role : null;
  const q = text(req.query.q, 100) || null;
  const users = await User.list({ role, q });
  res.render('admin/users', { title: 'Users', users, role, q });
};

exports.setUserFlag = async (req, res) => {
  const flag = req.body.flag === 'is_verified' ? 'is_verified' : 'is_active';
  await User.setFlag(positiveId(req.params.id), flag, req.body.value === '1');
  req.flash('success', 'User updated.');
  res.redirect(req.get('referer') || '/admin/users');
};

exports.payments = async (req, res) => {
  res.render('admin/payments', { title: 'Payments', payments: await Payment.list(null, 200) });
};

exports.reports = async (req, res) => {
  const status = STATUSES.report.includes(req.query.status) ? req.query.status : null;
  res.render('admin/reports', { title: 'Reports', reports: await Report.list(status), status });
};

exports.updateReport = async (req, res) => {
  if (STATUSES.report.includes(req.body.status)) {
    await Report.setStatus(positiveId(req.params.id), req.body.status, text(req.body.notes, 1000));
    req.flash('success', 'Report updated.');
  }
  res.redirect('/admin/reports');
};

exports.activity = async (req, res) => {
  const [inquiries, bookings] = await Promise.all([Inquiry.list(null, 100), Booking.list(null, 100)]);
  res.render('admin/activity', { title: 'Inquiries & viewings', inquiries, bookings });
};

exports.messages = async (req, res) => {
  res.render('admin/messages', { title: 'Messages', messages: await ContactMessage.list() });
};

exports.setMessageStatus = async (req, res) => {
  if (['new', 'read', 'replied', 'closed'].includes(req.body.status)) {
    await ContactMessage.setStatus(positiveId(req.params.id), req.body.status);
  }
  res.redirect('/admin/messages');
};
