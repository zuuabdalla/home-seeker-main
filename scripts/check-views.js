// Renders every template with sample data to catch template errors without a database.
// Usage: npm run check            (fails on the first broken template)
//        node scripts/check-views.js ./out   (also writes the HTML files to ./out)
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const helpers = require('../lib/viewHelpers');

const outDir = process.argv[2];
const views = path.join(__dirname, '../views');
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const now = new Date();

const property = (id, extra = {}) => ({
  id, title: 'Executive 2 Bedroom Furnished Apartment with Pool', description: 'Stunning, sunlit 2 bedroom apartment in the heart of Westlands. Open-plan fitted kitchen, backup generator, heated pool and 24/7 security.\n\nWalking distance to Sarit Centre.',
  property_type: 'apartment', listing_type: 'rent', price: 75000, bedrooms: 2, bathrooms: 2, property_size: 110, furnished: 1,
  county: 'Nairobi', town: 'Westlands', estate: 'Rhapta Road', address: 'Rhapta Road, Westlands', latitude: -1.2642, longitude: 36.7925,
  availability_status: 'available', available_from: '2026-11-01', verification_status: 'approved', rejection_reason: null,
  is_featured: 1, views: 142, created_at: now, updated_at: now, landlord_id: 2, landlord_name: 'Akinyi Kamau',
  primary_image: img('photo-1545324418-cc1a3fa10c00'), ...extra,
});
const listings = [
  property(1),
  property(2, { title: 'Charming 4 Bedroom Maisonette with Lush Garden', price: 180000, bedrooms: 4, town: 'Karen', property_type: 'maisonette', primary_image: img('photo-1600585154340-be6161a56a0c') }),
  property(3, { title: 'Cozy Bedsitter near TRM Mall', price: 12000, bedrooms: 0, bathrooms: 1, is_featured: 0, town: 'Roysambu', property_type: 'bedsitter', verification_status: 'pending', primary_image: img('photo-1522708323590-d24dbb6b0267') }),
  property(4, { title: 'Brand New 3 Bedroom Bungalow', listing_type: 'sale', price: 9500000, bedrooms: 3, is_featured: 0, county: 'Nakuru', town: 'Nakuru Town', verification_status: 'rejected', rejection_reason: 'Photos do not match the description.', primary_image: img('photo-1570129477492-45c003edd2be') }),
];
const detailed = {
  ...listings[0], landlord_phone: '0712345678', landlord_email: 'landlord@example.com', landlord_avatar: null, landlord_role: 'landlord',
  landlord_verified: 1, landlord_since: '2025-03-01',
  images: [img('photo-1545324418-cc1a3fa10c00'), img('photo-1512917774080-9991f1c4c750'), img('photo-1502672260266-1c1ef2d93688'), img('photo-1493809842364-78817add7ffb')].map((u, i) => ({ id: i + 1, image_url: u, is_primary: i === 0 ? 1 : 0 })),
  amenityList: ['parking', 'wifi', 'security', 'swimming_pool', 'generator', 'lift'],
  details: { pets_allowed: 0, suitable_for_families: 1, suitable_for_professionals: 1, parking_spaces: 2, minimum_rental_period: 6, house_rules: 'No loud music after 10pm.' },
};
const inquiry = { id: 1, property_id: 1, property_title: listings[0].title, landlord_name: 'Akinyi Kamau', seeker_name: 'David Ochieng', seeker_phone: '0722111222', seeker_email: 'david@example.com', message: 'Hello, is this apartment available for move-in this weekend? I would love to view on Saturday.', preferred_contact_method: 'whatsapp', status: 'new', created_at: new Date(Date.now() - 3600e3) };
const booking = { id: 1, property_id: 1, property_title: listings[0].title, property_town: 'Westlands', landlord_name: 'Akinyi Kamau', seeker_name: 'Brian Kiprop', seeker_phone: '0711999888', viewing_date: '2026-10-20', viewing_time: '14:00:00', message: 'Coming with my partner', status: 'pending', created_at: now };
const payment = { id: 1, user_name: 'Akinyi Kamau', phone_number: '254712345678', property_title: listings[0].title, package_name: 'Standard Promotion', amount: 1000, status: 'completed', transaction_reference: 'SAE3YULR0Y', external_reference: 'HF-1', payhero_reference: 'X', created_at: now };
const pendingPayment = { ...payment, id: 2, status: 'pending', transaction_reference: null };
const landlord = { id: 2, name: 'Akinyi Kamau', email: 'landlord@example.com', role: 'landlord', avatar: null };
const admin = { id: 1, name: 'HomeFinder Admin', email: 'admin@example.com', role: 'admin', avatar: null };
const formProperty = { ...detailed };

const base = (user, currentPath) => ({
  ...helpers, currentUser: user, currentPath, savedIds: [1], unreadCount: 3, csrfToken: 'test-token', flash: [],
});

const pages = [
  ['pages/home', '/', null, { title: 'Home', featured: listings.slice(0, 2), latest: listings.slice(0, 3) }],
  ['pages/home', '/', null, { title: 'Home (empty)', featured: [], latest: [] }, 'home-empty'],
  ['properties/index', '/properties', null, { title: 'Browse', properties: listings.slice(0, 2), total: 23, page: 2, pages: 3, filters: { q: 'Westlands', county: 'Nairobi', type: '', listing: 'rent', min_price: '', max_price: '100000', beds: '2', furnished: '1', amenity: 'parking', sort: 'price_asc' } }],
  ['properties/index', '/properties', null, { title: 'Browse (empty)', properties: [], total: 0, page: 1, pages: 1, filters: { q: 'zzz' } }, 'properties-empty'],
  ['properties/show', '/properties/1', null, { title: 'Listing', property: detailed, similar: listings.slice(1, 3), isPreview: false }],
  ['properties/show', '/properties/1', landlord, { title: 'Listing preview', property: { ...detailed, images: [], verification_status: 'pending', latitude: null }, similar: [], isPreview: true }, 'show-preview'],
  ['properties/saved', '/saved', null, { title: 'Saved', properties: listings.slice(0, 2) }],
  ['pages/about', '/about', null, { title: 'About' }],
  ['pages/contact', '/contact', null, { title: 'Contact', form: { name: 'Jo' }, errors: ['Please enter a valid email address.'] }],
  ['pages/error', '/x', null, { title: 'Page not found', status: 404, message: 'Not here.' }],
  ['auth/login', '/login', null, { title: 'Log in', email: '', next: '', errors: ['Incorrect email or password.'] }],
  ['auth/register', '/register', null, { title: 'Register', form: { role: 'landlord' } }],
  ['auth/forgot', '/forgot-password', null, { title: 'Forgot' }],
  ['auth/profile', '/profile', landlord, { title: 'Profile', profile: { full_name: 'Akinyi Kamau', email: 'landlord@example.com', phone: '0712345678', bio: '', role: 'landlord', is_verified: 1, created_at: now } }],
  ['landlord/dashboard', '/landlord', landlord, { title: 'Dashboard', stats: { listings: 4, live: 2, pending: 1, views: 1342, newInquiries: 2, pendingViewings: 1 }, listings, inquiries: [inquiry, { ...inquiry, id: 2, status: 'read' }], bookings: [booking] }],
  ['landlord/dashboard', '/landlord', landlord, { title: 'Dashboard (new)', stats: { listings: 0, live: 0, pending: 0, views: 0, newInquiries: 0, pendingViewings: 0 }, listings: [], inquiries: [], bookings: [] }, 'dashboard-empty'],
  ['landlord/listings', '/landlord/listings', landlord, { title: 'Listings', properties: listings }],
  ['landlord/property-form', '/landlord/listings/new', landlord, { title: 'Add', property: { amenityList: [], details: {}, images: [] } }, 'form-new'],
  ['landlord/property-form', '/landlord/listings/1/edit', landlord, { title: 'Edit', property: formProperty, errors: ['Enter a valid price.'] }, 'form-edit'],
  ['landlord/inquiries', '/landlord/inquiries', landlord, { title: 'Inquiries', inquiries: [inquiry, { ...inquiry, id: 2, status: 'responded', seeker_email: null }] }],
  ['landlord/bookings', '/landlord/viewings', landlord, { title: 'Viewings', bookings: [booking, { ...booking, id: 2, status: 'confirmed', message: null }] }],
  ['landlord/notifications', '/landlord/notifications', landlord, { title: 'Notifications', notifications: [{ id: 1, title: 'New inquiry', message: 'David asked about your apartment.', type: 'inquiry', is_read: 0, created_at: now }, { id: 2, title: 'Listing approved', message: 'Your listing is live.', type: 'property', is_read: 1, created_at: now }] }],
  ['landlord/promote', '/landlord/promote', landlord, { title: 'Promote', properties: listings.slice(0, 2), promotions: [], payments: [payment, pendingPayment], selected: 2 }],
  ['admin/dashboard', '/admin', admin, { title: 'Admin', stats: { pending: 1, reports: 2, listings: 6, landlords: 2, revenue: 3500, inquiries: 12, bookings: 4 }, pending: [listings[2]], reports: [{ id: 1, property_id: 1, reason: 'scam', property_title: 'Apartment', times_reported: 2, status: 'pending', created_at: now }], payments: [payment] }],
  ['admin/properties', '/admin/properties', admin, { title: 'Listings', properties: listings, status: 'all', q: '' }],
  ['admin/users', '/admin/users', admin, { title: 'Users', role: null, q: null, users: [{ id: 2, full_name: 'Akinyi Kamau', email: 'a@example.com', phone: '0712345678', role: 'landlord', listings: 4, is_active: 1, is_verified: 1 }, { id: 3, full_name: 'Mwangi Agency', email: 'm@example.com', phone: '0722334455', role: 'agent', listings: 2, is_active: 0, is_verified: 0 }] }],
  ['admin/payments', '/admin/payments', admin, { title: 'Payments', payments: [payment, pendingPayment] }],
  ['admin/reports', '/admin/reports', admin, { title: 'Reports', status: null, reports: [{ id: 1, property_id: 1, reason: 'fake_listing', description: 'Photos are from another website.', property_title: 'Apartment', landlord_name: 'Akinyi', times_reported: 3, status: 'investigating', admin_notes: 'Called landlord', reporter_name: 'Jane', reporter_phone: '0700111222', created_at: now }] }],
  ['admin/activity', '/admin/activity', admin, { title: 'Activity', inquiries: [inquiry], bookings: [booking] }],
  ['admin/messages', '/admin/messages', admin, { title: 'Messages', messages: [{ id: 1, name: 'Jo', email: 'jo@example.com', phone: null, subject: 'Question', message: 'How do I list?', status: 'new', created_at: now }] }],
];

(async () => {
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  for (const [view, currentPath, user, data, name] of pages) {
    const file = path.join(views, `${view}.ejs`);
    const html = await ejs.renderFile(file, { ...base(user, currentPath), ...data }, { async: false });
    if (outDir) fs.writeFileSync(path.join(outDir, `${name || view.replace('/', '-')}.html`), html);
    console.log(`ok  ${name || view}`);
  }
  console.log(`\nAll ${pages.length} pages rendered.`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
