const axios = require('axios');
const { AMENITIES, label } = require('../lib/viewHelpers');

// Writes listing descriptions for landlords. Uses Google Gemini when
// GEMINI_API_KEY is set, otherwise a plain template so the button still helps.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function summary(p) {
  const amenities = [].concat(p.amenities || []).map((a) => AMENITIES[a]).filter(Boolean);
  return {
    type: label(p.property_type || 'property').toLowerCase(),
    beds: Number(p.bedrooms) || 0,
    baths: Number(p.bathrooms) || 0,
    place: [p.estate, p.town, p.county].filter(Boolean).join(', ') || 'a convenient location',
    furnished: p.furnished === '1',
    amenities,
  };
}

function templateDescription(p) {
  const s = summary(p);
  const rooms = s.beds ? `${s.beds}-bedroom, ${s.baths}-bathroom ${s.type}` : `${s.type}`;
  const parts = [
    `A well-kept ${s.furnished ? 'furnished ' : ''}${rooms} in ${s.place}.`,
    s.amenities.length ? `Highlights include ${s.amenities.slice(0, 6).join(', ').toLowerCase()}.` : '',
    'Close to shops, schools and public transport. Contact the landlord to arrange a viewing.',
  ];
  return parts.filter(Boolean).join(' ');
}

async function generateDescription(p) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return templateDescription(p);

  const s = summary(p);
  const prompt = [
    'Write a warm, honest property listing description for a Kenyan rental website.',
    'Use 90 to 130 words, plain text, no headings, no emojis, and do not invent features that are not listed.',
    `Property: ${s.beds} bedroom(s), ${s.baths} bathroom(s) ${s.type} in ${s.place}.`,
    `Furnished: ${s.furnished ? 'yes' : 'no'}.`,
    `Amenities: ${s.amenities.join(', ') || 'not specified'}.`,
    p.title ? `Listing title: ${String(p.title).slice(0, 200)}.` : '',
  ].join('\n');

  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 400 } },
      { headers: { 'x-goog-api-key': key }, timeout: 15000 }
    );
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('').trim();
    return text || templateDescription(p);
  } catch (err) {
    console.warn('Gemini request failed, using template:', err.response?.data?.error?.message || err.message);
    return templateDescription(p);
  }
}

module.exports = { generateDescription };
