// Nhận request của nhóm các chức năng nhân viên theo nhóm quyền, kiểm tra đầu vào và gọi service;
// successResponse/errorResponse thống nhất dữ liệu trả cho frontend.
const staffService = require('../services/staff.services');
const categoryService = require('../services/category.services');
const inventoryService = require('../services/inventory.services');
const staffOrderService = require('../services/staffOrder.services');
const promotionService = require('../services/promotion.services');
const bannerService = require('../services/banner.services');
const newsletterService = require('../services/newsletter.services');
const supportService = require('../services/support.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');
const { deleteUploadedFiles } = require('../utils/file.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');

// Chuẩn hóa các tham số lọc dùng chung trước khi gọi service.
const getFilters = (query) => ({
    keyword: typeof query.keyword === 'string' ? query.keyword.trim().slice(0, 120) : '',
    status: query.status,
    scope: query.scope
});

// Trả phiên làm việc đã được kiểm tra cho ứng dụng quản lý.
const getSession = async (req, res) => {
    return successResponse(res, staffService.getSession(req.staff));
};
// Trả dữ liệu tham chiếu như danh mục/nhà cung cấp/quyền để điền các ô chọn.
const getLookups = async (req, res) => {
    try {
        return successResponse(res, await staffService.getLookups(req.staff.user));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả các số công việc và đơn gần đây cho màn hình nhân viên.
const getDashboard = async (req, res) => {
    try {
        return successResponse(res, await staffService.getDashboard(req.staff));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Nhận tên/ảnh danh mục, lưu qua service và dọn file nếu có lỗi.
const saveCategory = async (req, res) => {
    try {
        return successResponse(res, await categoryService.saveCategory(req.params.id, req.body || {}, req.files), null, 'Đã lưu danh mục');
    } catch (error) {
        deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
// Đọc bộ lọc lô/hạn dùng và trả bảng tồn đã phân trang.
const getInventory = async (req, res) => {
    try {
        const page = getPagination(req.query);
        const result = await inventoryService.getInventory(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Chỉ kiểm tra file/dòng nhập để trả lỗi xem trước, chưa ghi thêm tồn kho.
const previewImport = async (req, res) => {
    try {
        return successResponse(res, await inventoryService.previewImport(req.body?.rows));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Gửi các dòng đã chọn vào nghiệp vụ xác nhận; kết quả phân biệt đã lưu với đang chờ duyệt.
const confirmImport = async (req, res) => {
    try {
        const result = await inventoryService.confirmImport(req.user.userId, req.body || {});
        return successResponse(
            res,
            result,
            null,
            result.request_id ? 'Đã gửi phiếu nhập chờ quản trị viên duyệt' : 'Đã ghi nhận phiếu nhập',
            result.request_id ? 202 : 200
        );
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Lấy phiếu nhập đã ghi nhận để hiển thị kết quả và chứng từ.
const getReceipt = async (req, res) => {
    try {
        return successResponse(res, await inventoryService.getReceipt(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả số đơn chờ xác nhận cho huy hiệu đỏ trên sidebar.
const getOrderSummary = async (req, res) => {
    try {
        return successResponse(res, await staffOrderService.getSummary());
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả các đơn theo trạng thái/từ khóa với metadata phân trang.
const getOrders = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await staffOrderService.getOrders(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả thông tin một đơn để nhân viên gọi xác nhận và xử lý giao hàng.
const getOrder = async (req, res) => {
    try {
        return successResponse(res, await staffOrderService.getOrder(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Chuyển yêu cầu đổi bước và ghi chú cho service kiểm tra trước khi lưu.
const updateOrderStatus = async (req, res) => {
    try {
        return successResponse(res, await staffOrderService.updateStatus(req.user.userId, req.params.id, req.body || {}));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Lấy danh sách chương trình/mã giảm trong màn hình quản lý.
const getPromotions = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await promotionService.getManagePromotions(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Đọc dữ liệu một chương trình để mở form sửa.
const getPromotion = async (req, res) => {
    try {
        return successResponse(res, await promotionService.getPromotion(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Đọc dữ liệu khuyến mãi/ảnh và dọn file nếu service từ chối lưu.
const savePromotion = async (req, res) => {
    try {
        const data = { ...req.body };
        if (req.is('multipart/form-data')) {
            data.product_ids = JSON.parse(data.product_ids || '[]');
            data.discount_value = Number(data.discount_value);
            data.min_order_value = Number(data.min_order_value);
            data.requires_code = data.requires_code === 'true';
            data.is_flash_sale = data.is_flash_sale === 'true';
        }
        return successResponse(res, await promotionService.savePromotion(req.params.id, data, req.files), null, 'Đã lưu chương trình');
    } catch (error) {
        deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
// Gửi yêu cầu kết thúc chương trình đang được quản lý.
const endPromotion = async (req, res) => {
    try {
        await promotionService.endPromotion(req.params.id);
        return successResponse(res, null, null, 'Đã kết thúc chương trình');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Lấy danh sách banner có cả bản nháp và trạng thái lịch hiển thị.
const getBanners = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await bannerService.getBanners(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Đọc banner hiện tại để form quản lý điền lại thông tin.
const getBanner = async (req, res) => {
    try {
        return successResponse(res, await bannerService.getBanner(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Nhận ảnh/link/lịch hiển thị và chuyển service lưu với kiểm tra đầu vào.
const saveBanner = async (req, res) => {
    try {
        return successResponse(res, await bannerService.saveBanner(req.params.id, req.body || {}, req.files), null, 'Đã lưu banner');
    } catch (error) {
        deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
// Lấy danh sách cùng các thống kê phục vụ quản lý bản tin.
const getNewsletters = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await newsletterService.getNewsletters(page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements), 'Success', 200, {
            subscribers: result.subscribers
        });
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Đọc nội dung/tiến độ của bản tin để sửa hoặc xem kết quả.
const getNewsletter = async (req, res) => {
    try {
        return successResponse(res, await newsletterService.getNewsletter(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Lưu nội dung thành bản nháp qua service bản tin.
const saveNewsletter = async (req, res) => {
    try {
        return successResponse(res, await newsletterService.saveNewsletter(req.user.userId, req.params.id, req.body || {}));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Yêu cầu gửi bản tin đã lưu; service quản lý khóa gửi và kết quả từng email.
const sendNewsletter = async (req, res) => {
    try {
        return successResponse(res, await newsletterService.sendNewsletter(req.params.id), null, 'Đã bắt đầu gửi bản tin', 202);
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Trả danh sách hội thoại kèm tin cuối và số chưa đọc riêng của người đang xem.
const getRooms = async (req, res) => {
    try {
        return successResponse(res, await supportService.getRooms(req.query.status, req.user.userId, req.query.keyword || ''));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Lấy lịch sử hội thoại; service kiểm tra quyền xem và xử lý mốc tải trang trước.
const getRoom = async (req, res) => {
    try {
        return successResponse(res, await supportService.getRoom(req.params.id, req.user.userId, false, req.query.before));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Cho nhân viên tiếp nhận phòng qua nghiệp vụ khóa quyền phụ trách.
const claimRoom = async (req, res) => {
    try {
        return successResponse(res, await supportService.claimRoom(req.user.userId, req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
// Nhận nội dung/ảnh cho phòng đã tiếp nhận, trả phòng cập nhật hoặc dọn file khi lỗi.
const reply = async (req, res) => {
    try {
        return successResponse(res, await supportService.reply(req.user.userId, req.params.id, req.body?.content ?? '', req.files, req.body?.client_id));
    } catch (error) {
        if (!error.keepUploads) deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
// Gửi yêu cầu kết thúc hội thoại của nhân viên đang phụ trách.
const closeRoom = async (req, res) => {
    try {
        await supportService.closeRoom(req.user.userId, req.params.id);
        return successResponse(res, null);
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};

module.exports = {
    getSession,
    getLookups,
    getDashboard,
    saveCategory,
    getInventory,
    previewImport,
    confirmImport,
    getReceipt,
    getOrders,
    getOrderSummary,
    getOrder,
    updateOrderStatus,
    getPromotions,
    getPromotion,
    savePromotion,
    endPromotion,
    getBanners,
    getBanner,
    saveBanner,
    getNewsletters,
    getNewsletter,
    saveNewsletter,
    sendNewsletter,
    getRooms,
    getRoom,
    claimRoom,
    reply,
    closeRoom
};
