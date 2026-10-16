const db = require('../configs/database.config');
const slugify = require('slugify');
const dayjs = require('dayjs');
const { deleteUploadedFiles } = require('../utils/file.util');

// Tạo slug từ tên + mã sản phẩm (mã là duy nhất nên slug cũng không bị trùng)
// locale 'vi' để chuyển đúng chữ "Đ" thành "d" (mặc định slugify đổi thành "dj")
const createSlug = (name, code) => slugify(`${name} ${code}`, { lower: true, strict: true, locale: 'vi' });

// Các kiểu sắp xếp cho phép. Chỉ lấy câu ORDER BY từ đây, không ghép trực tiếp giá trị client gửi lên (tránh SQL Injection)
const SORT_OPTIONS = {
    newest: 'p.created_at DESC, p.id DESC',
    price_asc: 'min_price ASC, p.id DESC',
    price_desc: 'min_price DESC, p.id DESC',
    name_asc: 'p.name ASC, p.id DESC',
    best_selling: 'sold_quantity DESC, p.id DESC', // Bán chạy nhất (từ trước tới nay)
    trending: 'sold_last_30_days DESC, sold_quantity DESC, p.id DESC' // Xu hướng (bán nhiều trong 30 ngày gần đây)
};

// Điều kiện "khuyến mãi đang diễn ra" (bảng promotions đặt tên là pr)
const ACTIVE_PROMOTION_CONDITION = 'pr.valid_from <= NOW() AND pr.valid_to >= NOW()';

// Lưu ảnh sản phẩm: bảng files -> lấy file_id -> bảng product_images
const insertProductImages = async (connection, productId, uploadedFiles, userId) => {
    for (const file of uploadedFiles) {
        // Đổi đường dẫn dấu \ thành / cho chuẩn URL web
        const fileUrl = file.path.replace(/\\/g, '/');

        const [fileRes] = await connection.execute(
            `INSERT INTO files (owner_id, file_name, mime_type, url) VALUES (?, ?, ?, ?)`,
            [userId, file.originalname, file.mimetype, fileUrl]
        );

        await connection.execute(
            `INSERT INTO product_images (product_id, file_id, is_thumbnail) VALUES (?, ?, 0)`,
            [productId, fileRes.insertId]
        );
    }
};

// Nếu sản phẩm chưa có ảnh đại diện (thumbnail) thì lấy ảnh cũ nhất làm thumbnail
const ensureThumbnail = async (connection, productId) => {
    const [thumbnails] = await connection.execute(
        'SELECT id FROM product_images WHERE product_id = ? AND is_thumbnail = 1',
        [productId]
    );

    if (thumbnails.length === 0) {
        await connection.execute(
            'UPDATE product_images SET is_thumbnail = 1 WHERE product_id = ? ORDER BY id LIMIT 1',
            [productId]
        );
    }
};

/**
 * Lấy danh sách sản phẩm có tìm kiếm, bộ lọc và phân trang
 * filters: { keyword, category_id, min_price, max_price, status, on_sale, sort }
 * pagination: { pageSize, offset }
 */
const getProducts = async (filters, pagination) => {
    const { keyword, category_id, min_price, max_price, status, on_sale, sort } = filters;

    // Ghép điều kiện WHERE theo từng bộ lọc.
    // Muốn thêm bộ lọc mới (VD: lọc theo chi nhánh còn hàng) chỉ cần thêm 1 khối if giống bên dưới
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push('p.status = ?');
        params.push(status);
    }

    if (keyword) {
        conditions.push('(p.name LIKE ? OR p.code LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (category_id) {
        conditions.push('p.category_id = ?');
        params.push(category_id);
    }

    // Lọc theo giá: sản phẩm có ít nhất 1 quy cách nằm trong khoảng giá
    if (min_price !== null || max_price !== null) {
        let priceCondition = 'v.product_id = p.id';
        if (min_price !== null) {
            priceCondition += ' AND v.list_price >= ?';
            params.push(min_price);
        }
        if (max_price !== null) {
            priceCondition += ' AND v.list_price <= ?';
            params.push(max_price);
        }
        conditions.push(`EXISTS (SELECT 1 FROM product_variants v WHERE ${priceCondition})`);
    }

    // Chỉ lấy sản phẩm đang nằm trong 1 chương trình khuyến mãi còn hiệu lực
    if (on_sale) {
        conditions.push(`EXISTS (SELECT 1 FROM promotion_products pp JOIN promotions pr ON pr.id = pp.promotion_id
                                 WHERE pp.product_id = p.id AND ${ACTIVE_PROMOTION_CONDITION})`);
    }

    const whereSql = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 1. Đếm tổng số sản phẩm thỏa điều kiện (để tính totalPages)
    const [countRows] = await db.execute(`SELECT COUNT(*) AS total FROM products p ${whereSql}`, params);

    // 2. Lấy dữ liệu của trang hiện tại
    // Lưu ý: LIMIT/OFFSET phải truyền dạng chuỗi, mysql2 truyền số sẽ bị lỗi "Incorrect arguments to mysqld_stmt_execute"
    const [products] = await db.execute(
        `SELECT p.id, p.code, p.name, p.slug, p.status, p.created_at,
                p.category_id, c.name AS category_name,
                (SELECT MIN(v.list_price) FROM product_variants v WHERE v.product_id = p.id) AS min_price,
                (SELECT MAX(v.list_price) FROM product_variants v WHERE v.product_id = p.id) AS max_price,
                (SELECT v.unit FROM product_variants v WHERE v.product_id = p.id ORDER BY v.list_price LIMIT 1) AS unit,
                (SELECT COALESCE(SUM(bs.stock_quantity), 0)
                   FROM branch_stock bs JOIN product_variants v ON v.id = bs.variant_id
                  WHERE v.product_id = p.id AND bs.expiry_date >= CURDATE()) AS total_stock,
                (SELECT f.url
                   FROM product_images pi JOIN files f ON f.id = pi.file_id
                  WHERE pi.product_id = p.id AND pi.is_thumbnail = 1 LIMIT 1) AS thumbnail_url,
                (SELECT COALESCE(SUM(oi.quantity), 0)
                   FROM order_items oi
                   JOIN orders o ON o.id = oi.order_id
                   JOIN product_variants v ON v.id = oi.variant_id
                  WHERE v.product_id = p.id AND o.status = 'COMPLETED') AS sold_quantity,
                (SELECT COALESCE(SUM(oi.quantity), 0)
                   FROM order_items oi
                   JOIN orders o ON o.id = oi.order_id
                   JOIN product_variants v ON v.id = oi.variant_id
                  WHERE v.product_id = p.id AND o.status = 'COMPLETED'
                    AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS sold_last_30_days,
                (SELECT MAX(pr.discount_value)
                   FROM promotion_products pp JOIN promotions pr ON pr.id = pp.promotion_id
                  WHERE pp.product_id = p.id AND pr.discount_type = 'PERCENT' AND ${ACTIVE_PROMOTION_CONDITION}) AS discount_percent
         FROM products p
         JOIN categories c ON c.id = p.category_id
         ${whereSql}
         ORDER BY ${SORT_OPTIONS[sort] || SORT_OPTIONS.newest}
         LIMIT ? OFFSET ?`,
        [...params, String(pagination.pageSize), String(pagination.offset)]
    );

    return {
        products,
        totalElements: countRows[0].total
    };
};

/**
 * Lấy chi tiết 1 sản phẩm theo id (nhân viên) hoặc slug (khách hàng)
 * onlyPublished = true: chỉ lấy sản phẩm đang bán
 */
const getProductDetail = async ({ id, slug, onlyPublished }) => {
    let sql = `SELECT p.id, p.code, p.name, p.slug, p.description, p.status, p.created_at,
                      p.category_id, c.name AS category_name
               FROM products p
               JOIN categories c ON c.id = p.category_id
               WHERE ${id ? 'p.id = ?' : 'p.slug = ?'}`;

    if (onlyPublished) {
        sql += ` AND p.status = 'PUBLISHED'`;
    }

    const [products] = await db.execute(sql, [id || slug]);
    if (products.length === 0) throw new Error('PRODUCT_NOT_FOUND');

    const product = products[0];

    // Các quy cách kèm tồn kho (chỉ tính các lô còn hạn sử dụng, cộng tất cả chi nhánh)
    const [variants] = await db.execute(
        `SELECT v.id, v.sku, v.name, v.unit, v.step_quantity, v.list_price,
                (SELECT COALESCE(SUM(bs.stock_quantity), 0) FROM branch_stock bs
                  WHERE bs.variant_id = v.id AND bs.expiry_date >= CURDATE()) AS stock_quantity
         FROM product_variants v
         WHERE v.product_id = ?
         ORDER BY v.id`,
        [product.id]
    );

    // Ảnh sản phẩm, thumbnail đứng đầu
    const [images] = await db.execute(
        `SELECT pi.id, f.url, pi.is_thumbnail
         FROM product_images pi JOIN files f ON f.id = pi.file_id
         WHERE pi.product_id = ?
         ORDER BY pi.is_thumbnail DESC, pi.id`,
        [product.id]
    );

    product.variants = variants;
    product.images = images;
    return product;
};

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

        // 3. Lưu ảnh, ảnh đầu tiên là thumbnail
        await insertProductImages(connection, productId, uploaded_files, user_id);
        await ensureThumbnail(connection, productId);

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
 * Chỉnh sửa sản phẩm. Chỉ cập nhật những trường được gửi lên (trường nào undefined thì giữ nguyên)
 * - variants: quy cách có id -> sửa, không có id -> thêm mới
 * - delete_image_ids: danh sách id ảnh (product_images.id) cần xóa
 * - uploaded_files: ảnh mới được thêm vào
 */
const updateProduct = async (productData) => {
    const { id, code, name, description, category_id, status, variants, delete_image_ids, uploaded_files, user_id } = productData;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    const deletedFiles = []; // Ảnh cũ cần xóa khỏi ổ cứng sau khi lưu DB thành công

    try {
        // 1. Kiểm tra sản phẩm và danh mục có tồn tại không
        const [products] = await connection.execute('SELECT id, code, name FROM products WHERE id = ?', [id]);
        if (products.length === 0) throw new Error('PRODUCT_NOT_FOUND');
        const currentProduct = products[0];

        if (category_id !== undefined) {
            const [categories] = await connection.execute('SELECT id FROM categories WHERE id = ?', [category_id]);
            if (categories.length === 0) throw new Error('CATEGORY_NOT_FOUND');
        }

        // 2. Cập nhật thông tin chung (chỉ những trường được gửi lên)
        const fields = [];
        const params = [];

        if (code !== undefined) {
            fields.push('code = ?');
            params.push(code);
        }
        if (name !== undefined) {
            fields.push('name = ?');
            params.push(name);
        }
        if (description !== undefined) {
            fields.push('description = ?');
            params.push(description || null);
        }
        if (category_id !== undefined) {
            fields.push('category_id = ?');
            params.push(category_id);
        }
        if (status !== undefined) {
            fields.push('status = ?');
            params.push(status);
        }
        // Đổi tên hoặc mã thì tạo lại slug cho khớp
        if (code !== undefined || name !== undefined) {
            fields.push('slug = ?');
            params.push(createSlug(name || currentProduct.name, code || currentProduct.code));
        }

        if (fields.length > 0) {
            params.push(id);
            await connection.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
        }

        // 3. Cập nhật quy cách (variants)
        if (variants) {
            for (const v of variants) {
                if (v.id) {
                    // Quy cách phải thuộc đúng sản phẩm đang sửa
                    const [rows] = await connection.execute(
                        'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
                        [v.id, id]
                    );
                    if (rows.length === 0) throw new Error('VARIANT_NOT_FOUND');

                    await connection.execute(
                        `UPDATE product_variants SET sku = ?, name = ?, unit = ?, step_quantity = ?, list_price = ? WHERE id = ?`,
                        [v.sku, v.variant_name, v.unit || 'kg', v.step_quantity || 1, v.list_price, v.id]
                    );
                } else {
                    await connection.execute(
                        `INSERT INTO product_variants (product_id, sku, name, unit, step_quantity, list_price) VALUES (?, ?, ?, ?, ?, ?)`,
                        [id, v.sku, v.variant_name, v.unit || 'kg', v.step_quantity || 1, v.list_price]
                    );
                }
            }
        }

        // 4. Muốn công bố bán thì sản phẩm phải có ít nhất 1 quy cách (để có giá bán)
        if (status === 'PUBLISHED') {
            const [variantRows] = await connection.execute('SELECT id FROM product_variants WHERE product_id = ?', [id]);
            if (variantRows.length === 0) throw new Error('PRODUCT_HAS_NO_VARIANT');
        }

        // 5. Xóa ảnh cũ (xóa bản ghi bảng files thì product_images tự xóa theo nhờ ON DELETE CASCADE)
        if (delete_image_ids) {
            for (const imageId of delete_image_ids) {
                const [images] = await connection.execute(
                    `SELECT pi.file_id, f.url FROM product_images pi JOIN files f ON f.id = pi.file_id
                     WHERE pi.id = ? AND pi.product_id = ?`,
                    [imageId, id]
                );
                if (images.length === 0) throw new Error('IMAGE_NOT_FOUND');

                await connection.execute('DELETE FROM files WHERE id = ?', [images[0].file_id]);
                deletedFiles.push({ path: images[0].url });
            }
        }

        // 6. Thêm ảnh mới, nếu ảnh thumbnail bị xóa thì chọn lại thumbnail
        await insertProductImages(connection, id, uploaded_files, user_id);
        await ensureThumbnail(connection, id);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    // Lưu DB thành công mới xóa file ảnh cũ trên ổ cứng
    deleteUploadedFiles(deletedFiles);

    return getProductDetail({ id });
};

/**
 * Nhập hàng (tất cả trong 1 transaction, lỗi 1 dòng thì hủy cả phiếu nhập)
 * FE đọc file Excel, hiển thị bảng xem trước rồi gửi danh sách items dạng JSON lên
 * - SKU chưa có trong hệ thống -> tạo sản phẩm (nếu chưa có) + tạo SKU mới
 * - SKU đã có -> giữ nguyên thông tin sản phẩm, chỉ cộng thêm số lượng tồn kho
 * - Mỗi lần nhập tạo 1 phiếu nhập (goods_receipts) để lưu lịch sử
 */
const importGoods = async (importData) => {
    const { items, branch_id, supplier_id, note, user_id } = importData;

    // Không nhập mã lô thì lấy theo ngày nhập hàng, VD: LO-20261012
    const defaultBatchCode = 'LO-' + dayjs().format('YYYYMMDD');

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [branches] = await connection.execute('SELECT id FROM branches WHERE id = ?', [branch_id]);
        if (branches.length === 0) throw new Error('BRANCH_NOT_FOUND');

        // Bước 1: Kiểm tra các dòng có SKU mới phải đủ thông tin để tạo sản phẩm
        // (FE không biết SKU nào đã có trong DB nên phần này phải kiểm tra ở BE)
        const errors = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const rowNumber = i + 1; // Số thứ tự dòng trong bảng FE gửi lên

            const [variants] = await connection.execute('SELECT id FROM product_variants WHERE sku = ?', [item.sku]);
            if (variants.length > 0) continue; // SKU đã có -> chỉ cộng tồn kho, không cần kiểm tra thêm

            if (!item.code || !item.name || !item.category_id || !item.variant_name || item.list_price === undefined || item.list_price === null) {
                errors.push({ row: rowNumber, message: `SKU ${item.sku} chưa có trong hệ thống, cần nhập đủ Mã SP, Tên SP, Danh mục, Quy cách và Giá niêm yết` });
                continue;
            }

            const [categories] = await connection.execute('SELECT id FROM categories WHERE id = ?', [item.category_id]);
            if (categories.length === 0) {
                errors.push({ row: rowNumber, message: `Danh mục ${item.category_id} không tồn tại` });
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
        for (const item of items) {
            const [variants] = await connection.execute('SELECT id FROM product_variants WHERE sku = ?', [item.sku]);
            let variantId;

            if (variants.length > 0) {
                variantId = variants[0].id;
            } else {
                // SKU mới: tìm sản phẩm theo mã, chưa có thì tạo sản phẩm mới
                const [products] = await connection.execute('SELECT id FROM products WHERE code = ?', [item.code]);
                let productId;

                if (products.length > 0) {
                    productId = products[0].id;
                } else {
                    const [pRes] = await connection.execute(
                        `INSERT INTO products (category_id, code, name, slug, description, status) VALUES (?, ?, ?, ?, ?, 'PUBLISHED')`,
                        [item.category_id, item.code, item.name, createSlug(item.name, item.code), item.description || null]
                    );
                    productId = pRes.insertId;
                    createdProducts++;
                }

                const [vRes] = await connection.execute(
                    `INSERT INTO product_variants (product_id, sku, name, unit, step_quantity, list_price) VALUES (?, ?, ?, ?, ?, ?)`,
                    [productId, item.sku, item.variant_name, item.unit || 'kg', item.step_quantity || 1, item.list_price]
                );
                variantId = vRes.insertId;
                createdVariants++;
            }

            const batchCode = item.batch_code || defaultBatchCode;

            // Lưu chi tiết phiếu nhập
            await connection.execute(
                `INSERT INTO goods_receipt_items (receipt_id, variant_id, batch_code, quantity, unit_cost, manufactured_date, expiry_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [receiptId, variantId, batchCode, item.quantity, item.unit_cost, item.manufactured_date || null, item.expiry_date]
            );

            // Cộng tồn kho: chưa có lô này ở chi nhánh thì thêm mới, có rồi thì cộng dồn số lượng
            await connection.execute(
                `INSERT INTO branch_stock (branch_id, variant_id, batch_code, expiry_date, stock_quantity)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + ?`,
                [branch_id, variantId, batchCode, item.expiry_date, item.quantity, item.quantity]
            );

            totalAmount += item.quantity * item.unit_cost;
        }

        await connection.execute('UPDATE goods_receipts SET total_amount = ? WHERE id = ?', [totalAmount, receiptId]);

        await connection.commit();
        return {
            receipt_id: receiptId,
            total_rows: items.length,
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

module.exports = { getProducts, getProductDetail, createProduct, updateProduct, importGoods };
