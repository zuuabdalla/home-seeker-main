const router = require('express').Router();
const landlord = require('../controllers/landlordController');
const { requireLandlord } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

router.use(requireLandlord);

router.get('/', landlord.dashboard);
router.get('/listings', landlord.listings);
router.get('/listings/new', landlord.newForm);
router.post('/listings', upload.propertyImages, landlord.create);
router.get('/listings/:id/edit', landlord.editForm);
router.post('/listings/:id', upload.propertyImages, landlord.update);
router.post('/listings/:id/delete', landlord.remove);

router.get('/inquiries', landlord.inquiries);
router.post('/inquiries/:id/status', landlord.setInquiryStatus);
router.get('/viewings', landlord.bookings);
router.post('/viewings/:id/status', landlord.setBookingStatus);

router.get('/notifications', landlord.notifications);
router.post('/notifications/read', landlord.markNotificationsRead);
router.post('/notifications/:id/read', landlord.markNotificationsRead);

router.get('/promote', landlord.promote);

module.exports = router;
