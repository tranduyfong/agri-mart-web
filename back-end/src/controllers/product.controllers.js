const productService = require('../services/product.services');
const { successResponse, errorResponse } = require('../utils/response.util');
const { deleteUploadedFiles } = require('../utils/file.util');
const { readExcelFile, getText, getNumber, getDate } = require('../utils/excel.util');
const dayjs = require('dayjs');

const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

// Kiểm tra 1 quy cách (variant), trả về câu báo lỗi hoặc null nếu hợp lệ
const validateVariant = (v) => {
    if (!v.sku || !v.variant_name) {
        return 'Mỗi quy cách phải có SKU và tên quy cách';
    }
    if (v.list_price === undefined || v.list_price === null || isNaN(v.list_price) || Number(v.list_price) < 0) {
        return `Giá niêm yết của SKU ${v.sku} phải là số và không được âm`;
    }
    if (v.step_quantity !== undefined && v.step_quantity !== null && !(Number(v.step_quantity) > 0)) {
        return `Bước nhảy của SKU ${v.sku} phải lớn hơn 0`;
    }
    return null;
};

// Kiểm tra dữ liệu thêm sản phẩm, trả về câu báo lỗi hoặc null nếu hợp lệ
const validateProduct = (product, variants) => {
    if (!product.code || !product.name || !product.category_id) {
        return 'Mã, Tên và Danh mục là bắt buộc';
    }
    if (product.status && !PRODUCT_STATUSES.includes(product.status)) {
        return 'Trạng thái sản phẩm chỉ được là DRAFT, PUBLISHED hoặc ARCHIVED';
    }
    if (!Array.isArray(variants)) {
        return 'Danh sách quy cách (variants) không đúng định dạng JSON';
    }
    if (variants.length === 0) {
        return 'Sản phẩm phải có ít nhất 1 quy cách (variant)';
    }
    for (const v of variants) {
        const variantError = validateVariant(v);
        if (variantError) return variantError;
    }
    return null;
};

const addProduct = async (req, res) => {
    // Lấy danh sách file ảnh đã được middleware upload xuống ổ cứng
    const uploadedFiles = req.files || [];

    try {
        const { category_id, code, name, description, status, variants } = req.body;

        // Vì upload bằng multipart/form-data, chuỗi mảng phải được parse lại thành JSON
        let parsedVariants;
        try {
            parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        } catch (error) {
            parsedVariants = null; // JSON sai định dạng -> validateProduct sẽ báo lỗi
        }

        const errorMessage = validateProduct({ code, name, category_id, status }, parsedVariants);
        if (errorMessage) {
            deleteUploadedFiles(uploadedFiles); // Dữ liệu sai thì xóa ảnh vừa upload, tránh rác trên server
            return errorResponse(res, 'VALIDATION_FAILED', errorMessage, 400);
        }

        const productData = {
            category_id, code, name, description, status,
            variants: parsedVariants,
            uploaded_files: uploadedFiles,
            user_id: req.user.userId // Lấy ID người thao tác từ token để lưu owner_id cho file
        };

        const result = await productService.createProduct(productData);
        return successResponse(res, result, null, 'Thêm sản phẩm thành công', 201);
    } catch (error) {
        // Lưu DB lỗi thì xóa ảnh vừa upload
        deleteUploadedFiles(uploadedFiles);

        if (error.code === 'ER_DUP_ENTRY') {
            return errorResponse(res, 'DUPLICATE_DATA', 'Mã sản phẩm hoặc SKU đã tồn tại', 400);
        }
        if (error.message === 'CATEGORY_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Danh mục không tồn tại', 400);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
    }
};

// Kiểm tra 1 dòng trong file nhập hàng, trả về câu báo lỗi hoặc null nếu hợp lệ
// (Các thông tin để tạo sản phẩm mới như tên, danh mục... sẽ được service kiểm tra khi biết SKU là mới)
const validateImportRow = (row, rawRow) => {
    if (!row.sku) return 'Thiếu Mã SKU';
    if (row.quantity === null || !(row.quantity > 0)) return 'Số lượng phải là số lớn hơn 0';
    if (row.unit_cost === null || isNaN(row.unit_cost) || row.unit_cost < 0) return 'Giá nhập phải là số và không được âm';
    if (row.list_price !== null && (isNaN(row.list_price) || row.list_price < 0)) return 'Giá niêm yết phải là số và không được âm';
    if (row.step_quantity !== null && !(row.step_quantity > 0)) return 'Bước nhảy phải lớn hơn 0';
    if (!row.expiry_date) return 'Hạn sử dụng trống hoặc sai định dạng (dd/mm/yyyy)';
    if (dayjs(row.expiry_date).isBefore(dayjs(), 'day')) return 'Hạn sử dụng đã qua';
    if (getText(rawRow['Ngày sản xuất (manufactured_date)']) && !row.manufactured_date) {
        return 'Ngày sản xuất sai định dạng (dd/mm/yyyy)';
    }
    return null;
};

const importExcel = async (req, res) => {
    try {
        if (!req.file) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Vui lòng upload file Excel', 400);
        }

        // 1. Đọc file rồi xóa luôn file Excel để tiết kiệm dung lượng server
        const rawData = readExcelFile(req.file.path);
        deleteUploadedFiles([req.file]);

        const { branch_id, supplier_id, note } = req.body;

        if (!branch_id) {
            return errorResponse(res, 'VALIDATION_FAILED', 'Vui lòng chọn chi nhánh nhập hàng (branch_id)', 400);
        }
        if (!rawData) {
            return errorResponse(res, 'VALIDATION_FAILED', 'File Excel bị lỗi hoặc không đúng định dạng', 400);
        }
        if (rawData.length === 0) {
            return errorResponse(res, 'VALIDATION_FAILED', 'File Excel không có dữ liệu', 400);
        }

        // 2. Map dữ liệu và kiểm tra từng dòng
        const defaultBatchCode = 'LO-' + dayjs().format('YYYYMMDD'); // Không nhập mã lô thì lấy theo ngày nhập
        const rows = [];
        const errors = [];
        const checkedKeys = {}; // Dùng để phát hiện SKU + mã lô bị lặp trong file

        rawData.forEach((rawRow, index) => {
            const rowNumber = index + 2; // Dòng 1 trong Excel là tiêu đề

            const row = {
                row_number: rowNumber,
                code: getText(rawRow['Mã SP (code)']),
                name: getText(rawRow['Tên SP (name)']),
                category_id: getNumber(rawRow['Danh mục (category_id)']),
                description: getText(rawRow['Mô tả (description)']),
                sku: getText(rawRow['Mã SKU (sku)']),
                variant_name: getText(rawRow['Quy cách (variant_name)']),
                unit: getText(rawRow['Đơn vị (unit)']),
                step_quantity: getNumber(rawRow['Bước nhảy (step)']),
                list_price: getNumber(rawRow['Giá niêm yết (price)']),
                quantity: getNumber(rawRow['Số lượng (quantity)']),
                unit_cost: getNumber(rawRow['Giá nhập (unit_cost)']),
                batch_code: getText(rawRow['Mã lô (batch_code)']) || defaultBatchCode,
                manufactured_date: getDate(rawRow['Ngày sản xuất (manufactured_date)']),
                expiry_date: getDate(rawRow['Hạn sử dụng (expiry_date)'])
            };

            const errorMessage = validateImportRow(row, rawRow);
            if (errorMessage) {
                errors.push({ row: rowNumber, message: errorMessage });
                return;
            }

            const key = row.sku + '|' + row.batch_code;
            if (checkedKeys[key]) {
                errors.push({ row: rowNumber, message: `SKU ${row.sku} (lô ${row.batch_code}) bị lặp với dòng ${checkedKeys[key]}` });
                return;
            }
            checkedKeys[key] = rowNumber;

            rows.push(row);
        });

        if (errors.length > 0) {
            return errorResponse(res, 'VALIDATION_FAILED', `File có ${errors.length} dòng bị lỗi, vui lòng sửa lại`, 400, errors);
        }

        // 3. Lưu vào DB
        const result = await productService.importGoodsFromExcel({
            rows, branch_id, supplier_id, note,
            user_id: req.user.userId
        });

        return successResponse(res, result, null,
            `Nhập hàng thành công ${result.total_rows} dòng (tạo mới ${result.created_products} sản phẩm, ${result.created_variants} SKU)`);
    } catch (error) {
        if (error.message === 'INVALID_ROWS') {
            return errorResponse(res, 'VALIDATION_FAILED', `File có ${error.rows.length} dòng bị lỗi, vui lòng sửa lại`, 400, error.rows);
        }
        if (error.message === 'BRANCH_NOT_FOUND') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Chi nhánh không tồn tại', 400);
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return errorResponse(res, 'VALIDATION_FAILED', 'Nhà cung cấp không tồn tại', 400);
        }
        if (error.code === 'ER_DUP_ENTRY') {
            return errorResponse(res, 'DUPLICATE_DATA', 'Có Mã SP hoặc SKU trong file bị trùng lặp với hệ thống', 400, null, error.message);
        }
        return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi xử lý file Excel', 500, null, error.message);
    }
};

module.exports = { addProduct, importExcel };
