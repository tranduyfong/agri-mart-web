const express = require('express');
const addressController = require('../controllers/address.controllers');
const authenticate = require('../middlewares/auth.middleware');
const { addressBody, addressId } = require('../middlewares/account-validation.middleware');

const router = express.Router();

router.use(authenticate);

router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// Sổ địa chỉ cá nhân; danh mục tỉnh/phường sẽ có API riêng khi tích hợp nguồn dữ liệu.
router.get('/', addressController.getAddresses);
router.post('/', addressBody(true), addressController.createAddress);

router.get('/:id', addressId, addressController.getAddress);
router.patch('/:id', addressId, addressBody(false), addressController.updateAddress);
router.patch('/:id/default', addressId, addressController.setDefaultAddress);
router.delete('/:id', addressId, addressController.deleteAddress);

module.exports = router;
