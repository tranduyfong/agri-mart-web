// Cung cấp phiên làm việc, dữ liệu dropdown và các chỉ số công việc hôm nay cho nhân viên.
const Product = require('../models/product');
const Category = require('../models/category');
const Supplier = require('../models/supplier');
const Order = require('../models/order');
const ChatRoom = require('../models/chatRoom');
const staffOrderService = require('./staffOrder.services');
const inventoryService = require('./inventory.services');
const { getVariantPrice } = require('../utils/productStock.util');

// ADMIN có quyền quản lý; STAFF cần mã quyền tương ứng trong User.permissions.
const hasPermission = (user, permission) => user.role === 'ADMIN' || user.permissions.includes(permission);

// Đọc phiên làm việc mới nhất và chỉ cho tài khoản quản lý đang hoạt động truy cập.
const getSession = (staff) => ({
    user: {
        id: staff.user._id.toString(),
        full_name: staff.user.full_name,
        email: staff.user.email,
        role: staff.user.role,
        permissions: staff.user.permissions
    }
});

// Trả danh mục, nhà cung cấp và dữ liệu cần cho các ô chọn trong form nhân viên.
const getLookups = async (user) => {
    const [categories, suppliers, products] = await Promise.all([
        Category.find().sort({ name: 1 }).lean(),
        hasPermission(user, 'INVENTORY_MANAGE') ? Supplier.find().sort({ name: 1 }).lean() : [],
        hasPermission(user, 'PROMOTION_MANAGE') ? Product.find().select('name code variants').lean() : []
    ]);
    return {
        categories: categories.map((item) => ({ id: item._id.toString(), name: item.name, slug: item.slug })),
        suppliers: suppliers.map((item) => ({ id: item._id.toString(), code: item.code, name: item.name })),
        products: products.map((item) => ({
            id: item._id.toString(),
            code: item.code,
            name: item.name,
            variants: item.variants.map((variant) => ({ sku: variant.sku, list_price: getVariantPrice(variant), unit: variant.unit }))
        }))
    };
};

// Tổng hợp đơn cần xử lý, lô sắp hết hạn và hội thoại để ưu tiên công việc.
const getDashboard = async (staff) => {
    const user = staff.user;
    const [pending, preparing, expiring, support, missingImages, orders] = await Promise.all([
        hasPermission(user, 'ORDER_MANAGE') ? Order.countDocuments({ status: 'PENDING' }) : 0,
        hasPermission(user, 'ORDER_MANAGE') ? Order.countDocuments({ status: 'CONFIRMED' }) : 0,
        hasPermission(user, 'INVENTORY_MANAGE')
            ? inventoryService.getInventory({ status: 'EXPIRING' }, { offset: 0, pageSize: 1 })
            : { totalElements: 0 },
        hasPermission(user, 'SUPPORT_MANAGE') ? ChatRoom.countDocuments({ status: 'AI_ACTIVE' }) : 0,
        hasPermission(user, 'PRODUCT_MANAGE') ? Product.countDocuments({ status: 'DRAFT', images: { $size: 0 } }) : 0,
        hasPermission(user, 'ORDER_MANAGE') ? staffOrderService.getOrders({}, { offset: 0, pageSize: 5 }) : { items: [] }
    ]);
    return { pending, preparing, expiring: expiring.totalElements, support, missing_images: missingImages, orders: orders.items };
};

module.exports = { getSession, getLookups, getDashboard };
