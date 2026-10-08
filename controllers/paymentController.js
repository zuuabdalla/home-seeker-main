const Payment = require('../models/Payment');
const Property = require('../models/Property');
const PayHero = require('../services/payheroService');
const { PACKAGES } = require('../lib/constants');
const { positiveId } = require('../lib/validate');

// Landlord picks a listing + package; we send an M-Pesa prompt to their phone.
exports.start = async (req, res) => {
  const user = req.session.user;
  const packageKey = PACKAGES[req.body.package] ? req.body.package : null;
  const phone = PayHero.normalizePhone(req.body.phone);
  const property = await Property.findById(positiveId(req.body.property_id));
  const back = '/landlord/promote';

  if (!property || property.landlord_id !== user.id || property.verification_status !== 'approved') {
    req.flash('error', 'Choose one of your approved listings to promote.');
    return res.redirect(back);
  }
  if (!packageKey) {
    req.flash('error', 'Choose a promotion package.');
    return res.redirect(back);
  }
  if (!phone) {
    req.flash('error', 'Enter a valid M-Pesa number, e.g. 0712 345 678.');
    return res.redirect(back);
  }
  if (!PayHero.isConfigured() && !PayHero.isSimulated()) {
    req.flash('error', 'Online payments are not available right now. Please contact support to promote your listing.');
    return res.redirect(back);
  }

  const reference = PayHero.newReference();
  const paymentId = await Payment.create({
    user_id: user.id,
    property_id: property.id,
    packageKey,
    phone_number: phone,
    external_reference: reference,
  });

  if (PayHero.isSimulated()) {
    await Payment.complete(paymentId, { mpesaCode: 'SIMULATED', raw: { simulated: true } });
    req.flash('success', 'Test mode: payment simulated and your listing is now featured.');
    return res.redirect(back);
  }

  try {
    const payheroRef = await PayHero.requestPayment({ amount: PACKAGES[packageKey].price, phone, reference });
    await Payment.setPayheroReference(paymentId, payheroRef);
    req.flash('success', 'Check your phone and enter your M-Pesa PIN. Your listing is featured as soon as the payment clears.');
  } catch (err) {
    console.error('PayHero request failed:', err.response?.data || err.message);
    await Payment.fail(paymentId, { error: 'request_failed' });
    req.flash('error', 'We could not reach M-Pesa. No money was taken. Please try again.');
  }
  res.redirect(back);
};

// Confirms a payment by asking PayHero directly. We never trust a callback body on its own.
async function confirmWithPayHero(payment) {
  if (payment.status !== 'pending' || !payment.payhero_reference) return payment.status;
  const result = await PayHero.checkStatus(payment.payhero_reference);
  if (result.status === 'SUCCESS') {
    await Payment.complete(payment.id, { mpesaCode: result.mpesaCode, raw: result.raw });
    return 'completed';
  }
  if (result.status === 'FAILED') {
    await Payment.fail(payment.id, result.raw);
    return 'failed';
  }
  return 'pending';
}

// PayHero calls this after the customer pays (or cancels).
exports.callback = async (req, res) => {
  if (!PayHero.callbackTokenValid(req.query.token)) {
    return res.status(403).json({ ok: false });
  }
  const payment = await Payment.findByReference(PayHero.referenceFromCallback(req.body));
  if (!payment) return res.status(404).json({ ok: false });

  try {
    await confirmWithPayHero(payment);
    res.json({ ok: true });
  } catch (err) {
    console.error('Payment confirmation failed:', err.message);
    res.status(502).json({ ok: false }); // PayHero will retry
  }
};

// "Check status" button for landlords, in case a callback never arrives.
exports.refresh = async (req, res) => {
  const payment = await Payment.findByReference(String(req.params.reference || ''));
  if (!payment || payment.user_id !== req.session.user.id) {
    req.flash('error', 'Payment not found.');
    return res.redirect('/landlord/promote');
  }
  try {
    const status = await confirmWithPayHero(payment);
    const messages = {
      completed: ['success', 'Payment confirmed. Your listing is featured!'],
      failed: ['error', 'That payment did not go through. You were not charged.'],
      pending: ['info', 'Still waiting for M-Pesa. Please check again in a minute.'],
    };
    req.flash(...(messages[status] || messages.pending));
  } catch (err) {
    req.flash('error', 'Could not reach M-Pesa to check. Please try again shortly.');
  }
  res.redirect('/landlord/promote');
};
