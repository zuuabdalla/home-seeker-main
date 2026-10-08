// Fixed lists shared by models, controllers and views.

const PROPERTY_TYPES = ['apartment', 'bedsitter', 'studio', 'house', 'townhouse', 'bungalow', 'maisonette', 'villa'];

const AMENITIES = {
  parking: 'Parking',
  wifi: 'Wi-Fi',
  water: 'Constant water',
  electricity: 'Electricity',
  security: '24/7 security',
  cctv: 'CCTV',
  borehole: 'Borehole',
  balcony: 'Balcony',
  garden: 'Garden',
  swimming_pool: 'Swimming pool',
  gym: 'Gym',
  lift: 'Lift',
  laundry: 'Laundry',
  generator: 'Backup generator',
  gated_community: 'Gated community',
  playground: 'Playground',
};

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu', 'Machakos', 'Kajiado', 'Uasin Gishu',
  'Kilifi', 'Kwale', 'Nyeri', 'Meru', 'Kakamega', 'Kericho', 'Laikipia', 'Murang\'a',
  'Embu', 'Bungoma', 'Kisii', 'Nyandarua', 'Narok', 'Kitui', 'Lamu', 'Other',
];

const STATUSES = {
  inquiry: ['new', 'read', 'responded', 'closed'],
  booking: ['pending', 'confirmed', 'completed', 'cancelled'],
  report: ['pending', 'investigating', 'resolved', 'dismissed'],
  reportReason: ['fake_listing', 'wrong_information', 'scam', 'duplicate_listing', 'inappropriate_content', 'other'],
  availability: ['available', 'available_soon', 'occupied'],
  verification: ['pending', 'approved', 'rejected'],
  contactMethod: ['phone', 'whatsapp', 'email'],
};

const PACKAGES = {
  basic: { name: 'Basic Promotion', price: 500, days: 7 },
  standard: { name: 'Standard Promotion', price: 1000, days: 14 },
  premium: { name: 'Premium Promotion', price: 2000, days: 30 },
};

module.exports = { PROPERTY_TYPES, AMENITIES, COUNTIES, STATUSES, PACKAGES };
