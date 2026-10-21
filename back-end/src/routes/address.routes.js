const express = require('express');
const addressController = require('../controllers/address.controllers');

const router = express.Router();

// Danh mục công khai, không chứa thông tin địa chỉ riêng của tài khoản.
router.get('/provinces', addressController.getProvinces);
router.get('/provinces/:code/wards', addressController.getWardsByProvince);

module.exports = router;
