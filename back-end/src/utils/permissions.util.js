const STAFF_PERMISSIONS = [
    { code: 'PRODUCT_MANAGE', name: 'Sản phẩm và danh mục', description: 'Xem, thêm và cập nhật sản phẩm, ảnh, giá và danh mục.' },
    { code: 'INVENTORY_MANAGE', name: 'Kho và nhập hàng', description: 'Xem tồn kho, kiểm tra file và xác nhận nhập hàng.' },
    { code: 'ORDER_MANAGE', name: 'Đơn hàng', description: 'Xem, gọi điện duyệt đơn để khách thanh toán, cập nhật giao hàng và hủy đơn.' },
    { code: 'PROMOTION_MANAGE', name: 'Khuyến mãi', description: 'Quản lý ưu đãi sản phẩm và mã giảm phí giao.' },
    { code: 'BANNER_MANAGE', name: 'Banner quảng cáo', description: 'Quản lý ảnh, lịch hiển thị và xuất bản banner.' },
    { code: 'NEWSLETTER_MANAGE', name: 'Bản tin email', description: 'Soạn, xem trước và xác nhận gửi bản tin.' },
    { code: 'SUPPORT_MANAGE', name: 'Chăm sóc khách hàng', description: 'Tiếp nhận, trả lời và kết thúc hội thoại.' }
];
module.exports = { STAFF_PERMISSIONS };
