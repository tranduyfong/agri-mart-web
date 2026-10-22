const express = require('express');
const orderController = require('../controllers/order.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/vnpay-return', orderController.vnpayReturn);
router.get('/vnpay-ipn', orderController.vnpayIpn);
router.post('/preview', verifyToken, orderController.getPreview);
router.post('/checkout', verifyToken, orderController.checkout);
router.get('/:code', verifyToken, orderController.getDetail);
router.post('/:code/payment-url', verifyToken, orderController.getPaymentUrl);
router.post('/:code/check-payment', verifyToken, orderController.checkPayment);

module.exports = router;
