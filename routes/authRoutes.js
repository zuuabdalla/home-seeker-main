const router = require('express').Router();
const auth = require('../controllers/authController');
const { requireLogin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/security');
const upload = require('../middleware/uploadMiddleware');

router.get('/login', auth.loginPage);
router.post('/login', loginLimiter, auth.login);
router.get('/register', auth.registerPage);
router.post('/register', loginLimiter, auth.register);
router.post('/logout', auth.logout);
router.get('/forgot-password', auth.forgotPage);

router.get('/profile', requireLogin, auth.profilePage);
router.post('/profile', requireLogin, upload.avatar, auth.updateProfile);
router.post('/profile/password', requireLogin, loginLimiter, auth.changePassword);

module.exports = router;
