const express = require('express');
const newsletterController = require('../controllers/newsletter.controllers');
const router = express.Router();
router.post('/subscribe', newsletterController.subscribe);
router.get('/unsubscribe/:token', newsletterController.confirmUnsubscribe);
router.post('/unsubscribe/:token', newsletterController.unsubscribe);
module.exports = router;
