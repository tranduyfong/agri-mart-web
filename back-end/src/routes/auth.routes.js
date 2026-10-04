const router = require('express').Router();

const authController = require('../controllers/auth.controllers');

const validate = require('../middlewares/auth-validation.middleware');

const auth = require('../middlewares/auth.middleware');

const rateLimit = require('../middlewares/rate-limit.middleware');

// Do not trust arbitrary X-Forwarded-For; app keeps Express trust proxy disabled.
const overall = rateLimit({
    limit: 120,
    windowMs: 15 * 60 * 1000
});

const emails = rateLimit({
    limit: 10,
    windowMs: 10 * 60 * 1000
});

const attempts = rateLimit({
    limit: 30,
    windowMs: 15 * 60 * 1000
});

router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');

    next();
}, overall);

router.post('/register', emails, validate('register'), authController.register);

router.post('/resend-verification', emails, validate('resend'), authController.resend);

router.post('/verify-email', attempts, validate('verify'), authController.verifyEmail);

router.post('/login', attempts, validate('login'), authController.login);

router.post('/forgot-password', emails, validate('forgot'), authController.forgot);

router.post('/verify-reset-code', attempts, validate('verify'), authController.verifyReset);

router.post('/reset-password', attempts, validate('reset'), authController.reset);

router.get('/me', auth, authController.me);

router.post('/change-password', attempts, auth, validate('change'), authController.change);

router.post('/logout', auth, authController.logout);

module.exports = router;
