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

const getFilters = (query) => ({
    keyword: typeof query.keyword === 'string' ? query.keyword.trim().slice(0, 120) : '',
    status: query.status,
    scope: query.scope
});

const getSession = async (req, res) => {
    return successResponse(res, staffService.getSession(req.staff));
};
const getLookups = async (req, res) => {
    try {
        return successResponse(res, await staffService.getLookups(req.staff.user));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getDashboard = async (req, res) => {
    try {
        return successResponse(res, await staffService.getDashboard(req.staff));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const saveCategory = async (req, res) => {
    try {
        return successResponse(res, await categoryService.saveCategory(req.params.id, req.body || {}, req.files), null, 'Đã lưu danh mục');
    } catch (error) {
        deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
const getInventory = async (req, res) => {
    try {
        const page = getPagination(req.query);
        const result = await inventoryService.getInventory(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const previewImport = async (req, res) => {
    try {
        return successResponse(res, await inventoryService.previewImport(req.body?.rows));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const confirmImport = async (req, res) => {
    try {
        return successResponse(res, await inventoryService.confirmImport(req.user.userId, req.body || {}), null, 'Đã ghi nhận phiếu nhập');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getReceipt = async (req, res) => {
    try {
        return successResponse(res, await inventoryService.getReceipt(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getOrderSummary = async (req, res) => {
    try {
        return successResponse(res, await staffOrderService.getSummary());
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getOrders = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await staffOrderService.getOrders(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getOrder = async (req, res) => {
    try {
        return successResponse(res, await staffOrderService.getOrder(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const updateOrderStatus = async (req, res) => {
    try {
        return successResponse(res, await staffOrderService.updateStatus(req.user.userId, req.params.id, req.body || {}));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getPromotions = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await promotionService.getManagePromotions(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getPromotion = async (req, res) => {
    try {
        return successResponse(res, await promotionService.getPromotion(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
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
const endPromotion = async (req, res) => {
    try {
        await promotionService.endPromotion(req.params.id);
        return successResponse(res, null, null, 'Đã kết thúc chương trình');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getBanners = async (req, res) => {
    try {
        const page = getPagination(req.query),
            result = await bannerService.getBanners(getFilters(req.query), page);
        return successResponse(res, result.items, buildPagination(page.pageNumber, page.pageSize, result.totalElements));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getBanner = async (req, res) => {
    try {
        return successResponse(res, await bannerService.getBanner(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const saveBanner = async (req, res) => {
    try {
        return successResponse(res, await bannerService.saveBanner(req.params.id, req.body || {}, req.files), null, 'Đã lưu banner');
    } catch (error) {
        deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
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
const getNewsletter = async (req, res) => {
    try {
        return successResponse(res, await newsletterService.getNewsletter(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const saveNewsletter = async (req, res) => {
    try {
        return successResponse(res, await newsletterService.saveNewsletter(req.user.userId, req.params.id, req.body || {}));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const sendNewsletter = async (req, res) => {
    try {
        return successResponse(res, await newsletterService.sendNewsletter(req.params.id), null, 'Đã bắt đầu gửi bản tin', 202);
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getRooms = async (req, res) => {
    try {
        return successResponse(res, await supportService.getRooms(req.query.status));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const getRoom = async (req, res) => {
    try {
        return successResponse(res, await supportService.getRoom(req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const claimRoom = async (req, res) => {
    try {
        return successResponse(res, await supportService.claimRoom(req.user.userId, req.params.id));
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};
const reply = async (req, res) => {
    try {
        return successResponse(res, await supportService.reply(req.user.userId, req.params.id, req.body?.content || '', req.files));
    } catch (error) {
        deleteUploadedFiles(req.files || []);
        return staffErrorResponse(res, error);
    }
};
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
