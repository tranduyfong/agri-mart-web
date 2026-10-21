const productService = require('../services/product.services');
const { successResponse, errorResponse } = require('../utils/response.util');
const { deleteUploadedFiles } = require('../utils/file.util');
const { getPagination, buildPagination } = require('../utils/pagination.util');

// Parse field dạng JSON (gửi lên bằng multipart/form-data sẽ là chuỗi, gửi bằng body JSON thì Express đã parse sẵn)
const parseJsonField = (value) => {
    return typeof value === 'string' ? JSON.parse(value) : value;
};

// Đọc số từ query, không truyền hoặc không phải số thì trả về null (bỏ qua bộ lọc đó)
const getQueryNumber = (value) => {
    if (value === undefined || value === '' || isNaN(value)) return null;
    return Number(value);
};

/**
 * Đọc các bộ lọc của danh sách sản phẩm từ query
 * VD: ?keyword=cà chua&min_price=10000&max_price=50000&sort=price_asc
 * Muốn thêm bộ lọc mới thì đọc thêm ở đây và thêm điều kiện trong productService.getProducts
 */
const getProductFilters = (query) => {
    return {
        keyword: typeof query.keyword === 'string' ? query.keyword.trim() : '',
        category_id: typeof query.category_id === 'string' ? query.category_id.trim() : null,
        min_price: getQueryNumber(query.min_price),
        max_price: getQueryNumber(query.max_price),
        status: query.status || null,
        on_sale: query.on_sale === 'true', // ?on_sale=true: chỉ lấy sản phẩm đang khuyến mãi
        sort: query.sort || 'newest' // newest, price_asc, price_desc, name_asc, best_selling, trending
    };
};

// Xử lý chung cho API danh sách sản phẩm của khách hàng và nhân viên
const handleGetProducts = async (req, res, onlyPublished) => {
    try {
        const pagination = getPagination(req.query);
        const filters = getProductFilters(req.query);

        // Khách hàng chỉ được xem sản phẩm đang bán, bỏ qua status do client gửi lên
        if (onlyPublished) {
            filters.status = 'PUBLISHED';
        }

        const result = await productService.getProducts(filters, pagination);

        return successResponse(res, result.products, buildPagination(pagination.pageNumber, pagination.pageSize, result.totalElements));
    } catch (error) {
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

// [Khách hàng] Danh sách sản phẩm đang bán (không cần đăng nhập)
const getPublicProducts = (req, res) => handleGetProducts(req, res, true);

// [Nhân viên] Danh sách tất cả sản phẩm (bao gồm nháp, ngừng bán), lọc được theo status
const getManageProducts = (req, res) => handleGetProducts(req, res, false);

// [Khách hàng] Chi tiết sản phẩm đang bán theo slug
const getPublicProductDetail = async (req, res) => {
    try {
        const product = await productService.getProductDetail({
            slug: req.params.slug,
            onlyPublished: true
        });
        return successResponse(res, product);
    } catch (error) {
        if (error.message === 'PRODUCT_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không tồn tại hoặc đã ngừng bán', 404);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

// [Nhân viên] Chi tiết sản phẩm theo id (xem được cả sản phẩm nháp, ngừng bán)
const getManageProductDetail = async (req, res) => {
    try {
        const product = await productService.getProductDetail({
            id: req.params.id,
            onlyPublished: false
        });
        return successResponse(res, product);
    } catch (error) {
        if (error.message === 'PRODUCT_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không tồn tại', 404);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

const addProduct = async (req, res) => {
    // Lấy danh sách file ảnh đã được middleware upload xuống ổ cứng
    const uploadedFiles = req.files || [];

    try {
        const { category_id, code, name, description, status, variants } = req.body || {};

        const productData = {
            category_id,
            code,
            name,
            description,
            status,
            variants: parseJsonField(variants), // multipart/form-data gửi mảng dạng chuỗi nên phải parse lại
            image_urls: parseJsonField(req.body?.image_urls),
            uploaded_files: uploadedFiles
        };

        const result = await productService.createProduct(productData);
        return successResponse(res, result, null, 'Thêm sản phẩm thành công', 201);
    } catch (error) {
        // Lưu DB lỗi thì xóa ảnh vừa upload, tránh rác trên server
        deleteUploadedFiles(uploadedFiles);

        if (error.code === 11000) {
            return errorResponse(res, 'DUPLICATE_DATA', 'Mã sản phẩm hoặc SKU đã tồn tại', 400);
        }
        if (error.message === 'CATEGORY_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Danh mục không tồn tại', 400);
        }
        if (
            error.name === 'ValidationError' ||
            error.name === 'CastError' ||
            ['INVALID_PRODUCT_DATA', 'PRODUCT_HAS_NO_VARIANT'].includes(error.message) ||
            error instanceof SyntaxError
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin sản phẩm hoặc quy cách không hợp lệ', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

// [Nhân viên] Chỉnh sửa sản phẩm: thông tin chung, trạng thái, quy cách (giá...), thêm/xóa ảnh
const updateProduct = async (req, res) => {
    // Ảnh mới (nếu có) đã được middleware upload xuống ổ cứng
    const uploadedFiles = req.files || [];

    try {
        const { code, name, description, category_id, status, variants, delete_image_ids } = req.body || {};

        const result = await productService.updateProduct({
            id: req.params.id,
            code,
            name,
            description,
            category_id,
            status,
            variants: parseJsonField(variants),
            delete_image_ids: parseJsonField(delete_image_ids),
            delete_image_urls: parseJsonField(req.body?.delete_image_urls),
            image_urls: parseJsonField(req.body?.image_urls),
            uploaded_files: uploadedFiles
        });

        return successResponse(res, result, null, 'Cập nhật sản phẩm thành công');
    } catch (error) {
        // Lưu DB lỗi thì xóa ảnh mới vừa upload
        deleteUploadedFiles(uploadedFiles);

        if (error.name === 'VersionError') {
            return errorResponse(res, 'CONFLICT', 'Sản phẩm vừa thay đổi. Vui lòng thử lại.', 409);
        }
        if (error.message === 'PRODUCT_NOT_FOUND') {
            return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Sản phẩm không tồn tại', 404);
        }
        if (error.message === 'CATEGORY_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Danh mục không tồn tại', 400);
        }
        if (error.message === 'VARIANT_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Quy cách không tồn tại hoặc không thuộc sản phẩm này', 400);
        }
        if (error.message === 'IMAGE_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Ảnh cần xóa không tồn tại hoặc không thuộc sản phẩm này', 400);
        }
        if (error.message === 'PRODUCT_HAS_NO_VARIANT') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Sản phẩm phải có ít nhất 1 quy cách mới được công bố bán', 400);
        }
        if (error.code === 11000) {
            return errorResponse(res, 'DUPLICATE_DATA', 'Mã sản phẩm hoặc SKU đã tồn tại', 400);
        }
        if (
            error.name === 'ValidationError' ||
            error.name === 'CastError' ||
            error.message === 'INVALID_PRODUCT_DATA' ||
            error instanceof SyntaxError
        ) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin sản phẩm hoặc quy cách không hợp lệ', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

// [Nhân viên] Nhập hàng: FE đọc file Excel, hiển thị bảng xem trước rồi gửi danh sách items dạng JSON lên
// SKU chưa có -> tạo sản phẩm mới, SKU đã có -> cộng thêm số lượng tồn kho
const importGoods = async (req, res) => {
    try {
        const { branch_id, supplier_id, note, items } = req.body || {};

        const result = await productService.importGoods({
            items,
            branch_id,
            supplier_id,
            note,
            user_id: req.user.userId
        });

        return successResponse(
            res,
            result,
            null,
            `Nhập hàng thành công ${result.total_rows} dòng (tạo mới ${result.created_products} sản phẩm, ${result.created_variants} SKU)`
        );
    } catch (error) {
        if (error.message === 'INVALID_ROWS') {
            return errorResponse(res, 'VALIDATION_FAILED', `Có ${error.rows.length} dòng bị lỗi, vui lòng sửa lại`, 400, error.rows);
        }
        if (error.message === 'BRANCH_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Chi nhánh không tồn tại', 400);
        }
        if (error.message === 'SUPPLIER_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Nhà cung cấp không tồn tại', 400);
        }
        if (error.code === 11000) {
            return errorResponse(res, 'DUPLICATE_DATA', 'Có Mã SP hoặc SKU bị trùng lặp với hệ thống', 400, null, error.message);
        }
        if (error.name === 'ValidationError' || error.name === 'CastError' || error.message === 'INVALID_PRODUCT_DATA') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Thông tin phiếu nhập không hợp lệ', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống khi nhập hàng', 500, null, error.message);
    }
};

module.exports = {
    getPublicProducts,
    getPublicProductDetail,
    getManageProducts,
    getManageProductDetail,
    addProduct,
    updateProduct,
    importGoods
};
