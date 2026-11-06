// Đổi lỗi nghiệp vụ/Mongoose thành mã HTTP và thông báo tiếng Việt cho các API quản lý.
const { errorResponse } = require('./response.util');

const messages = {
    AI_UNAVAILABLE: [409, 'Trợ lý AI đang tắt. Bạn có thể tiếp tục nhắn nhân viên cửa hàng.'],
    SUPPLIER_CODE_EXISTS: [409, 'Mã nhà cung cấp đã tồn tại. Vui lòng chọn mã khác.'],
    CHAT_INVALID_IMAGE: [400, 'Ảnh không hợp lệ. Chọn JPG, PNG, GIF hoặc WEBP, mỗi ảnh tối đa 5 MB.'],
    PRODUCT_CHANGE_PENDING: [409, 'Sản phẩm đã có thay đổi đang chờ duyệt. Vui lòng chờ quản trị viên xử lý.'],
    PRODUCT_CHANGE_REVIEWED: [409, 'Yêu cầu đã được xử lý. Vui lòng tải lại danh sách.'],
    PRODUCT_CHANGE_STALE: [409, 'Thông tin sản phẩm đã thay đổi sau khi gửi duyệt. Hãy từ chối và yêu cầu nhân viên gửi lại.'],
    PRODUCT_CODE_EXISTS: [400, 'Mã sản phẩm hoặc SKU đã tồn tại'],
    REQUESTER_UNAVAILABLE: [409, 'Người gửi không còn hoạt động hoặc đã bị thu hồi quyền thực hiện thay đổi'],
    PRODUCT_NOT_FOUND: [404, 'Sản phẩm không tồn tại'],
    CATEGORY_NOT_FOUND: [400, 'Danh mục không tồn tại'],
    VARIANT_NOT_FOUND: [400, 'Quy cách không tồn tại trong sản phẩm'],
    IMAGE_NOT_FOUND: [400, 'Ảnh cần xóa không còn trong sản phẩm'],
    PRODUCT_HAS_NO_VARIANT: [400, 'Sản phẩm cần có quy cách trước khi đăng bán'],
    INVALID_PRODUCT_DATA: [400, 'Thông tin sản phẩm không hợp lệ'],
    INVENTORY_PERMISSION_REQUIRED: [403, 'Người gửi cần quyền quản lý kho để nhập tồn ban đầu'],
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
    SUPPLIER_REQUIRED: [400, 'Vui lòng chọn nhà cung cấp trước khi nhập hàng'],
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
