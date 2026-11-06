// Đường dẫn cho quản trị tài khoản, xét duyệt và báo cáo; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const controller = require('../controllers/admin.controllers');
const { verifyToken, verifyAdmin } = require('../middlewares/auth.middleware');
const router = express.Router();
const productChangeController = require('../controllers/productChange.controllers');
const supplierController = require('../controllers/supplier.controllers');
router.use(verifyToken, verifyAdmin);
router.get('/suppliers', supplierController.getSuppliers);
router.get('/suppliers/:id', supplierController.getSupplier);
router.get('/suppliers/:id/items', supplierController.getSupplierItems);
router.post('/suppliers', supplierController.saveSupplier);
router.put('/suppliers/:id', supplierController.saveSupplier);
router.get('/product-changes', productChangeController.getChanges);
router.get('/product-changes/:id', productChangeController.getChange);
router.patch('/product-changes/:id/review', productChangeController.reviewChange);
router.get('/session', controller.getSession);
router.get('/lookups', controller.getLookups);
router.get('/accounts', controller.getAccounts);
router.get('/accounts/:id', controller.getAccount);
router.post('/accounts', controller.createStaff);
router.put('/accounts/:id', controller.updateAccount);
router.patch('/accounts/:id/lock', controller.setAccountLock);
router.put('/accounts/:id/permissions', controller.savePermissions);
router.get('/reports/revenue', controller.getRevenue);
router.get('/reports/inventory', controller.getInventoryReport);
module.exports = router;
