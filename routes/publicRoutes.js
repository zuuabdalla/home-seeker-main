const router = require('express').Router();
const site = require('../controllers/publicController');
const { formLimiter } = require('../middleware/security');

router.get('/', site.home);
router.get('/properties', site.listings);
router.get('/properties/:id', site.show);
router.post('/properties/:id/inquiry', formLimiter, site.sendInquiry);
router.post('/properties/:id/viewing', formLimiter, site.bookViewing);
router.post('/properties/:id/report', formLimiter, site.report);
router.post('/properties/:id/save', site.toggleSave);

router.get('/saved', site.saved);
router.get('/about', site.about);
router.get('/contact', site.contactPage);
router.post('/contact', formLimiter, site.sendContact);

module.exports = router;
