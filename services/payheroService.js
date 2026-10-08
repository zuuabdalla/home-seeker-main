const axios = require('axios');
const crypto = require('crypto');
const env = require('../config/env');

// PayHero M-Pesa STK Push. Docs: https://docs.payhero.co.ke
const API = process.env.PAYHERO_API_URL || 'https://backend.payhero.co.ke/api/v2';

function authHeader() {
  const token = Buffer.from(`${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

const PayHero = {
  isConfigured() {
    return Boolean(process.env.PAYHERO_USERNAME && process.env.PAYHERO_PASSWORD && process.env.PAYHERO_CHANNEL_ID);
  },

  // Local testing only: approves payments without M-Pesa. config/env.js blocks it in production.
  isSimulated() {
    return process.env.PAYMENTS_SIMULATE === 'true' && !env.isProduction;
  },

  // "0712 345 678" / "+254712345678" -> "254712345678". Returns null if it is not a Kenyan mobile number.
  normalizePhone(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '254' + digits.slice(1);
    if (digits.length === 9) digits = '254' + digits;
    return /^254(7|1)\d{8}$/.test(digits) ? digits : null;
  },

  newReference() {
    return `HF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  },

  callbackUrl() {
    return `${env.appUrl}/payments/callback?token=${encodeURIComponent(process.env.PAYHERO_CALLBACK_SECRET || '')}`;
  },

  // Sends the "enter your M-Pesa PIN" prompt to the customer's phone.
  async requestPayment({ amount, phone, reference }) {
    const { data } = await axios.post(
      `${API}/payments`,
      {
        amount,
        phone_number: phone,
        channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
        provider: 'm-pesa',
        external_reference: reference,
        callback_url: this.callbackUrl(),
      },
      { headers: authHeader(), timeout: 15000 }
    );
    if (!data || !data.success || !data.reference) {
      throw new Error('PayHero did not accept the payment request.');
    }
    return data.reference; // PayHero's own reference, used to check the status later
  },

  // Asks PayHero directly whether a payment went through. Returns
  // { status: 'SUCCESS' | 'FAILED' | 'QUEUED', mpesaCode, raw }.
  async checkStatus(payheroReference) {
    const { data } = await axios.get(`${API}/transaction-status`, {
      params: { reference: payheroReference },
      headers: authHeader(),
      timeout: 15000,
    });
    return {
      status: String(data.status || '').toUpperCase(),
      mpesaCode: data.provider_reference || data.third_party_reference || null,
      raw: data,
    };
  },

  // The callback URL carries a secret so random requests are rejected early.
  callbackTokenValid(token) {
    const secret = process.env.PAYHERO_CALLBACK_SECRET || '';
    if (!secret || typeof token !== 'string' || token.length !== secret.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  },

  // Pulls our external reference out of PayHero's callback body.
  referenceFromCallback(body = {}) {
    const r = body.response || {};
    return r.ExternalReference || r.external_reference || body.external_reference || null;
  },
};

module.exports = PayHero;
