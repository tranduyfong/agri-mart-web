const { errorResponse } = require('./response.util');

const messages = {
    ADMIN_PROTECTED: [403, 'Thao tác này chỉ áp dụng cho tài khoản nhân viên hoặc khách hàng phù hợp'],
    INVALID_REPORT_RANGE: [400, 'Khoảng ngày không hợp lệ. Chọn từ ngày đến ngày, tối đa 367 ngày.'],
    ADDRESS_API_UNAVAILABLE: [503, 'Chưa tải được địa chỉ. Vui lòng thử lại sau.'],
    INVALID_ADDRESS_CODE: [400, 'Mã địa chỉ không hợp lệ'],
    PROVINCE_NOT_FOUND: [400, 'Tỉnh/thành phố không tồn tại'],
    WARD_NOT_FOUND: [400, 'Phường/xã không thuộc tỉnh/thành phố đã chọn'],
    RESOURCE_NOT_FOUND: [404, 'Không tìm thấy dữ liệu'],
    INVALID_DATA: [400, 'Thông tin không hợp lệ. Vui lòng kiểm tra các trường đã nhập.'],
    INVALID_ROWS: [400, 'Thông tin lô hàng không hợp lệ. Vui lòng kiểm tra lại file.'],
    SUPPLIER_NOT_FOUND: [400, 'Nhà cung cấp không tồn tại'],
    PRODUCT_HAS_NO_IMAGE: [400, 'Sản phẩm cần có ảnh trước khi đăng bán'],
    IMAGE_REQUIRED: [400, 'Sản phẩm cần có ảnh trước khi đăng bán'],
    IMPORT_INVALID_ROWS: [400, 'File còn dòng lỗi. Vui lòng kiểm tra lại trước khi nhập.'],
    ORDER_INVALID_TRANSITION: [409, 'Trạng thái đơn vừa thay đổi hoặc thao tác không còn phù hợp'],
    ORDER_UNPAID: [409, 'Đơn thanh toán trực tuyến chưa được xác nhận thanh toán'],
    ORDER_STOCK_EXPIRED: [409, 'Lô hàng của đơn đã hết hạn. Hãy hủy đơn và liên hệ khách hàng.'],
    ORDER_STOCK_MISSING: [409, 'Đơn thiếu thông tin xuất lô. Vui lòng kiểm tra trước khi hủy.'],
    ROOM_TAKEN: [409, 'Hội thoại đã được nhân viên khác tiếp nhận hoặc đã kết thúc'],
    DRAFT_ONLY: [409, 'Chỉ có thể sửa bản tin đang ở bản nháp'],
    NO_SUBSCRIBERS: [400, 'Chưa có email đăng ký nhận bản tin'],
    MAIL_NOT_CONFIGURED: [503, 'Chưa cấu hình email gửi bản tin'],
    VERSION_CONFLICT: [409, 'Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại.']
};

const staffErrorResponse = (res, error) => {
    if (error.code === 11000)
        return errorResponse(
            res,
            'DUPLICATE_DATA',
            error.keyPattern?.email
                ? 'Email này đã được sử dụng bởi tài khoản khác'
                : error.keyPattern?.phone
                  ? 'Số điện thoại đã được sử dụng'
                  : 'Mã hoặc đường dẫn đã tồn tại',
            400
        );
    if (['ValidationError', 'CastError'].includes(error.name) || error instanceof SyntaxError) {
        return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin không hợp lệ', 400);
    }
    if (error.name === 'VersionError') return errorResponse(res, 'CONFLICT', 'Dữ liệu vừa thay đổi. Vui lòng thử lại.', 409);
    const known = messages[error.message];
    if (known) return errorResponse(res, error.message, known[1], known[0], error.rows || null);
    return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Không thể thực hiện thao tác', 500, null, error.message);
};

module.exports = { staffErrorResponse };
