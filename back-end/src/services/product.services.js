const db = require('../configs/database.config');
const slugify = require('slugify');

// Tạo slug từ tên + mã sản phẩm (mã là duy nhất nên slug cũng không bị trùng)
// locale 'vi' để chuyển đúng chữ "Đ" thành "d" (mặc định slugify đổi thành "dj")
const createSlug = (name, code) => slugify(`${name} ${code}`, { lower: true, strict: true, locale: 'vi' });

const createProduct = async (productData) => {
    const { category_id, code, name, description, status, variants, uploaded_files, user_id } = productData;
    const slug = createSlug(name, code);

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 0. Kiểm tra danh mục có tồn tại không
        const [categories] = await connection.execute('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (categories.length === 0) throw new Error('CATEGORY_NOT_FOUND');

        // 1. Insert bảng products
        const [prodResult] = await connection.execute(
            `INSERT INTO products (category_id, code, name, slug, description, status) VALUES (?, ?, ?, ?, ?, ?)`,
            [category_id, code, name, slug, description || null, status || 'DRAFT']
        );
        const productId = prodResult.insertId;

        // 2. Insert các variants (SKU), đơn vị và bước nhảy không nhập thì lấy mặc định
        for (const v of variants) {
            await connection.execute(
                `INSERT INTO product_variants (product_id, sku, name, unit, step_quantity, list_price) VALUES (?, ?, ?, ?, ?, ?)`,
                [productId, v.sku, v.variant_name, v.unit || 'kg', v.step_quantity || 1, v.list_price]
            );
        }

        // 3. Xử lý ảnh: Lưu vào bảng files -> Lấy file_id -> Lưu vào product_images
        if (uploaded_files && uploaded_files.length > 0) {
            for (let i = 0; i < uploaded_files.length; i++) {
                const file = uploaded_files[i];

                // Đổi đường dẫn dấu \ thành / cho chuẩn URL web
                const fileUrl = file.path.replace(/\\/g, '/');

                // Insert vào bảng files
                const [fileRes] = await connection.execute(
                    `INSERT INTO files (owner_id, file_name, mime_type, url) VALUES (?, ?, ?, ?)`,
                    [user_id, file.originalname, file.mimetype, fileUrl]
                );
                const fileId = fileRes.insertId;

                // Insert vào product_images (ảnh đầu tiên là thumbnail)
                const isThumbnail = (i === 0) ? 1 : 0;
                await connection.execute(
                    `INSERT INTO product_images (product_id, file_id, is_thumbnail) VALUES (?, ?, ?)`,
                    [productId, fileId, isThumbnail]
                );
            }
        }

        await connection.commit();
        return { productId, slug };
    } catch (error) {
        // Ảnh đã upload sẽ được controller xóa khi có lỗi
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Nhập hàng từ file Excel (tất cả trong 1 transaction, lỗi 1 dòng thì hủy cả file):
 * - SKU chưa có trong hệ thống -> tạo sản phẩm (nếu chưa có) + tạo SKU mới
 * - SKU đã có -> giữ nguyên thông tin sản phẩm, chỉ cộng thêm số lượng tồn kho
 * - Mỗi lần nhập tạo 1 phiếu nhập (goods_receipts) để lưu lịch sử
 */
const importGoodsFromExcel = async (importData) => {
    const { rows, branch_id, supplier_id, note, user_id } = importData;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [branches] = await connection.execute('SELECT id FROM branches WHERE id = ?', [branch_id]);
        if (branches.length === 0) throw new Error('BRANCH_NOT_FOUND');

        // Bước 1: Kiểm tra các dòng có SKU mới phải đủ thông tin để tạo sản phẩm
        const errors = [];
        for (const row of rows) {
            const [variants] = await connection.execute('SELECT id FROM product_variants WHERE sku = ?', [row.sku]);
            if (variants.length > 0) continue; // SKU đã có -> chỉ cộng tồn kho, không cần kiểm tra thêm

            if (!row.code || !row.name || !row.category_id || !row.variant_name || row.list_price === null) {
                errors.push({ row: row.row_number, message: `SKU ${row.sku} chưa có trong hệ thống, cần nhập đủ Mã SP, Tên SP, Danh mục, Quy cách và Giá niêm yết` });
                continue;
            }

            const [categories] = await connection.execute('SELECT id FROM categories WHERE id = ?', [row.category_id]);
            if (categories.length === 0) {
                errors.push({ row: row.row_number, message: `Danh mục ${row.category_id} không tồn tại` });
            }
        }

        if (errors.length > 0) {
            const error = new Error('INVALID_ROWS');
            error.rows = errors;
            throw error;
        }

        // Bước 2: Tạo phiếu nhập hàng
        const [receiptRes] = await connection.execute(
            `INSERT INTO goods_receipts (branch_id, supplier_id, created_by, note) VALUES (?, ?, ?, ?)`,
            [branch_id, supplier_id || null, user_id, note || null]
        );
        const receiptId = receiptRes.insertId;

        let createdProducts = 0;
        let createdVariants = 0;
        let totalAmount = 0;

        // Bước 3: Xử lý từng dòng
        for (const row of rows) {
            const [variants] = await connection.execute('SELECT id FROM product_variants WHERE sku = ?', [row.sku]);
            let variantId;

            if (variants.length > 0) {
                variantId = variants[0].id;
            } else {
                // SKU mới: tìm sản phẩm theo mã, chưa có thì tạo sản phẩm mới
                const [products] = await connection.execute('SELECT id FROM products WHERE code = ?', [row.code]);
                let productId;

                if (products.length > 0) {
                    productId = products[0].id;
                } else {
                    const [pRes] = await connection.execute(
                        `INSERT INTO products (category_id, code, name, slug, description, status) VALUES (?, ?, ?, ?, ?, 'PUBLISHED')`,
                        [row.category_id, row.code, row.name, createSlug(row.name, row.code), row.description]
                    );
                    productId = pRes.insertId;
                    createdProducts++;
                }

                const [vRes] = await connection.execute(
                    `INSERT INTO product_variants (product_id, sku, name, unit, step_quantity, list_price) VALUES (?, ?, ?, ?, ?, ?)`,
                    [productId, row.sku, row.variant_name, row.unit || 'kg', row.step_quantity || 1, row.list_price]
                );
                variantId = vRes.insertId;
                createdVariants++;
            }

            // Lưu chi tiết phiếu nhập
            await connection.execute(
                `INSERT INTO goods_receipt_items (receipt_id, variant_id, batch_code, quantity, unit_cost, manufactured_date, expiry_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [receiptId, variantId, row.batch_code, row.quantity, row.unit_cost, row.manufactured_date, row.expiry_date]
            );

            // Cộng tồn kho: chưa có lô này ở chi nhánh thì thêm mới, có rồi thì cộng dồn số lượng
            await connection.execute(
                `INSERT INTO branch_stock (branch_id, variant_id, batch_code, expiry_date, stock_quantity)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?`,
                [branch_id, variantId, row.batch_code, row.expiry_date, row.quantity, row.quantity]
            );

            totalAmount += row.quantity * row.unit_cost;
        }

        await connection.execute('UPDATE goods_receipts SET total_amount = ? WHERE id = ?', [totalAmount, receiptId]);

        await connection.commit();
        return {
            receipt_id: receiptId,
            total_rows: rows.length,
            created_products: createdProducts,
            created_variants: createdVariants,
            total_amount: totalAmount
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = { createProduct, importGoodsFromExcel };
