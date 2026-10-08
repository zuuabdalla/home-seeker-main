const router = require('express').Router();
const payments = require('../controllers/paymentController');
const { requireLandlord } = require('../middleware/auth');

router.post('/payments/start', requireLandlord, payments.start);
router.post('/payments/:reference/refresh', requireLandlord, payments.refresh);
router.post('/payments/callback', payments.callback); // called by PayHero, protected by a secret token

module.exports = router;
