const express = require('express');
const controller = require('../controllers/account.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', controller.getAccount);
router.patch('/profile', controller.updateProfile);
router.get('/addresses', controller.getAddresses);
router.get('/addresses/default', controller.getDefaultAddress);
router.post('/addresses', controller.saveAddress);
router.put('/addresses/:id', controller.saveAddress);
router.patch('/addresses/:id/default', controller.setDefaultAddress);
router.delete('/addresses/:id', controller.removeAddress);
router.post('/change-password', controller.changePassword);

module.exports = router;
