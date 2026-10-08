const router = require('express').Router();
const ai = require('../controllers/aiController');
const { requireLandlord } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/security');

router.post('/describe', requireLandlord, aiLimiter, ai.describe);

module.exports = router;
