const router = require('express').Router();
const admin = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/', admin.dashboard);
router.get('/properties', admin.properties);
router.post('/properties/:id/approve', admin.approve);
router.post('/properties/:id/reject', admin.reject);
router.get('/users', admin.users);
router.post('/users/:id/flag', admin.setUserFlag);
router.get('/payments', admin.payments);
router.get('/reports', admin.reports);
router.post('/reports/:id', admin.updateReport);
router.get('/activity', admin.activity);
router.get('/messages', admin.messages);
router.post('/messages/:id/status', admin.setMessageStatus);

module.exports = router;
