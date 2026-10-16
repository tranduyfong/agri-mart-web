/**
 * Tạo dữ liệu mẫu để hiển thị trang chủ: danh mục, sản phẩm (kèm ảnh), tồn kho, khuyến mãi, đơn hàng đã bán
 *
 * Cách chạy (trong thư mục back-end):  npm run seed
 *
 * - Chỉ chạy được khi DB CHƯA có danh mục và sản phẩm nào (tránh tạo trùng dữ liệu)
 * - Ảnh lấy trong thư mục seed/images (bộ Fluent Emoji 3D của Microsoft - giấy phép MIT)
 *   và được copy vào thư mục uploads/ giống như ảnh upload thật
 * - Ngày khuyến mãi được tính theo thời điểm chạy script, nên các khuyến mãi luôn đang diễn ra
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const db = require('../src/configs/database.config');

const IMAGE_FOLDER = path.join(__dirname, 'images');

// ===================== DỮ LIỆU MẪU =====================

const CATEGORIES = [
    { slug: 'trai-cay', name: 'Trái cây', image: 'red_apple.png' },
    { slug: 'rau-cu', name: 'Rau củ', image: 'carrot.png' },
    { slug: 'thit', name: 'Thịt', image: 'cut_of_meat.png' },
    { slug: 'hai-san', name: 'Hải sản', image: 'fish.png' },
    { slug: 'trung-sua', name: 'Trứng & Sữa', image: 'glass_of_milk.png' },
    { slug: 'gao-ngu-coc', name: 'Gạo & Ngũ cốc', image: 'sheaf_of_rice.png' },
    { slug: 'banh-mi', name: 'Bánh mì', image: 'bread.png' },
    { slug: 'cac-loai-hat', name: 'Các loại hạt', image: 'peanuts.png' },
    { slug: 'ca-phe-tra', name: 'Cà phê & Trà', image: 'hot_beverage.png' },
    { slug: 'nuoc-ep', name: 'Nước ép', image: 'beverage_box.png' },
    { slug: 'nam', name: 'Nấm', image: 'mushroom.png' },
    { slug: 'gia-vi', name: 'Gia vị', image: 'hot_pepper.png' }
];

// variants: [Tên quy cách, đơn vị, bước nhảy, giá bán, số lượng tồn kho]
// daysAgo: sản phẩm được tạo cách đây bao nhiêu ngày (số nhỏ = hàng mới về)
const PRODUCTS = [
    { code: 'TC001', category: 'trai-cay', name: 'Dâu tây Đà Lạt', image: 'strawberry.png', daysAgo: 40,
        variants: [['Hộp 500g', 'hộp', 1, 65000, 40], ['Túi 1kg', 'kg', 0.5, 120000, 25]] },
    { code: 'TC002', category: 'trai-cay', name: 'Táo xanh New Zealand', image: 'green_apple.png', daysAgo: 39,
        variants: [['Túi 1kg', 'kg', 0.5, 85000, 60]] },
    { code: 'TC003', category: 'trai-cay', name: 'Táo đỏ Mỹ', image: 'red_apple.png', daysAgo: 38,
        variants: [['Túi 1kg', 'kg', 0.5, 79000, 50]] },
    { code: 'TC004', category: 'trai-cay', name: 'Nho tím không hạt', image: 'grapes.png', daysAgo: 37,
        variants: [['Túi 1kg', 'kg', 0.5, 110000, 35]] },
    { code: 'TC005', category: 'trai-cay', name: 'Chuối già Nam Mỹ', image: 'banana.png', daysAgo: 36,
        variants: [['Nải 1.2kg', 'nải', 1, 35000, 45]] },
    { code: 'TC006', category: 'trai-cay', name: 'Việt quất tươi', image: 'blueberries.png', daysAgo: 2,
        variants: [['Hộp 125g', 'hộp', 1, 89000, 20]] },
    { code: 'TC007', category: 'trai-cay', name: 'Xoài cát Hòa Lộc', image: 'mango.png', daysAgo: 34,
        variants: [['Túi 1kg', 'kg', 0.5, 65000, 30]] },
    { code: 'TC008', category: 'trai-cay', name: 'Dứa Queen', image: 'pineapple.png', daysAgo: 33,
        variants: [['Quả', 'quả', 1, 22000, 40]] },
    { code: 'TC009', category: 'trai-cay', name: 'Đào Sa Pa', image: 'peach.png', daysAgo: 1,
        variants: [['Túi 1kg', 'kg', 0.5, 95000, 15]] },
    { code: 'TC010', category: 'trai-cay', name: 'Dưa hấu không hạt', image: 'watermelon.png', daysAgo: 31,
        variants: [['Quả 2kg', 'quả', 1, 45000, 25]] },
    { code: 'TC011', category: 'trai-cay', name: 'Bơ sáp Đắk Lắk', image: 'avocado.png', daysAgo: 3,
        variants: [['Túi 1kg', 'kg', 0.5, 55000, 30]] },
    { code: 'TC012', category: 'trai-cay', name: 'Dừa xiêm Bến Tre', image: 'coconut.png', daysAgo: 29,
        variants: [['Quả', 'quả', 1, 18000, 50]] },
    { code: 'RC001', category: 'rau-cu', name: 'Cải bó xôi', image: 'leafy_green.png', daysAgo: 28,
        variants: [['Bó 300g', 'bó', 1, 18000, 40]] },
    { code: 'RC002', category: 'rau-cu', name: 'Súp lơ xanh', image: 'broccoli.png', daysAgo: 27,
        variants: [['Túi 1kg', 'kg', 0.5, 45000, 30]] },
    { code: 'RC003', category: 'rau-cu', name: 'Cà rốt Đà Lạt', image: 'carrot.png', daysAgo: 26,
        variants: [['Túi 1kg', 'kg', 0.5, 25000, 60]] },
    { code: 'RC004', category: 'rau-cu', name: 'Cà chua bi', image: 'tomato.png', daysAgo: 25,
        variants: [['Hộp 500g', 'hộp', 1, 30000, 45]] },
    { code: 'RC005', category: 'rau-cu', name: 'Dưa leo', image: 'cucumber.png', daysAgo: 24,
        variants: [['Túi 1kg', 'kg', 0.5, 22000, 50]] },
    { code: 'RC006', category: 'rau-cu', name: 'Bắp Mỹ', image: 'ear_of_corn.png', daysAgo: 23,
        variants: [['Bắp', 'bắp', 1, 10000, 80]] },
    { code: 'RC007', category: 'rau-cu', name: 'Khoai tây Đà Lạt', image: 'potato.png', daysAgo: 22,
        variants: [['Túi 1kg', 'kg', 0.5, 28000, 70]] },
    { code: 'TH001', category: 'thit', name: 'Thịt bò Úc', image: 'cut_of_meat.png', daysAgo: 21,
        variants: [['Khay 500g', 'khay', 1, 145000, 20], ['Túi 1kg', 'kg', 0.5, 280000, 10]] },
    { code: 'TH002', category: 'thit', name: 'Đùi gà ta', image: 'poultry_leg.png', daysAgo: 20,
        variants: [['Túi 1kg', 'kg', 0.5, 89000, 25]] },
    { code: 'HS001', category: 'hai-san', name: 'Cá hồi Na Uy', image: 'fish.png', daysAgo: 19,
        variants: [['Khay 300g', 'khay', 1, 135000, 15]] },
    { code: 'HS002', category: 'hai-san', name: 'Tôm sú', image: 'shrimp.png', daysAgo: 18,
        variants: [['Túi 1kg', 'kg', 0.5, 320000, 12]] },
    { code: 'TS001', category: 'trung-sua', name: 'Sữa tươi thanh trùng', image: 'glass_of_milk.png', daysAgo: 17,
        variants: [['Hộp 1L', 'hộp', 1, 38000, 50]] },
    { code: 'TS002', category: 'trung-sua', name: 'Trứng gà ta', image: 'egg.png', daysAgo: 16,
        variants: [['Vỉ 10 quả', 'vỉ', 1, 35000, 60]] },
    { code: 'GN001', category: 'gao-ngu-coc', name: 'Gạo ST25', image: 'sheaf_of_rice.png', daysAgo: 15,
        variants: [['Túi 1kg', 'kg', 1, 38000, 100], ['Túi 5kg', 'túi', 1, 185000, 40]] },
    { code: 'BM001', category: 'banh-mi', name: 'Bánh mì nguyên cám', image: 'bread.png', daysAgo: 14,
        variants: [['Ổ', 'ổ', 1, 15000, 30]] },
    { code: 'BM002', category: 'banh-mi', name: 'Bánh sừng bò', image: 'croissant.png', daysAgo: 13,
        variants: [['Cái', 'cái', 1, 22000, 25]] },
    { code: 'HT001', category: 'cac-loai-hat', name: 'Đậu phộng rang', image: 'peanuts.png', daysAgo: 12,
        variants: [['Túi 500g', 'túi', 1, 45000, 35]] },
    { code: 'CP001', category: 'ca-phe-tra', name: 'Cà phê hạt Robusta', image: 'hot_beverage.png', daysAgo: 11,
        variants: [['Túi 500g', 'túi', 1, 120000, 20]] },
    { code: 'CP002', category: 'ca-phe-tra', name: 'Trà xanh Thái Nguyên', image: 'teacup_without_handle.png', daysAgo: 4,
        variants: [['Hộp 200g', 'hộp', 1, 85000, 25]] },
    { code: 'NE001', category: 'nuoc-ep', name: 'Nước ép cam', image: 'beverage_box.png', daysAgo: 9,
        variants: [['Hộp 1L', 'hộp', 1, 42000, 30]] },
    { code: 'NM001', category: 'nam', name: 'Nấm hương tươi', image: 'mushroom.png', daysAgo: 5,
        variants: [['Hộp 300g', 'hộp', 1, 35000, 25]] },
    { code: 'GV001', category: 'gia-vi', name: 'Ớt chỉ thiên', image: 'hot_pepper.png', daysAgo: 7,
        variants: [['Hộp 100g', 'hộp', 1, 12000, 40]] }
];

// Khuyến mãi: ngày bắt đầu/kết thúc tính theo số giờ so với lúc chạy script
// products: danh sách mã sản phẩm được áp dụng (để trống = áp dụng cho cả đơn hàng)
const PROMOTIONS = [
    { code: 'KHACHMOI35', name: 'Cho đơn hàng đầu tiên', type: 'PERCENT', value: 35, scope: 'PRODUCT',
        minOrder: 0, fromHours: -48, toHours: 24 * 10, products: [] },
    { code: 'DONLON25', name: 'Cho đơn hàng từ 300.000đ', type: 'PERCENT', value: 25, scope: 'PRODUCT',
        minOrder: 300000, fromHours: -24, toHours: 24 * 15, products: [] },
    { code: 'TRAICAY15', name: 'Cho các loại trái cây', type: 'PERCENT', value: 15, scope: 'PRODUCT',
        minOrder: 0, fromHours: -2, toHours: 24 * 7, products: ['TC001', 'TC002', 'TC004', 'TC007', 'TC009', 'TC011'] },
    { code: 'FREESHIP30', name: 'Miễn phí giao hàng cho đơn từ 150.000đ', type: 'AMOUNT', value: 30000, scope: 'SHIPPING',
        minOrder: 150000, fromHours: -72, toHours: 24 * 20, products: [] },
    { code: 'FLASHSALE40', name: 'Siêu sale rau củ cuối tuần', type: 'PERCENT', value: 40, scope: 'PRODUCT', isFlashSale: true,
        minOrder: 0, fromHours: -1, toHours: 24 * 2 + 5, products: ['RC001', 'RC002', 'RC003', 'RC004', 'RC005', 'RC007'] },
    // Khuyến mãi đã hết hạn: không hiển thị trên trang chủ
    { code: 'TET2026', name: 'Tết sum vầy', type: 'PERCENT', value: 20, scope: 'PRODUCT',
        minOrder: 0, fromHours: -24 * 60, toHours: -24 * 30, products: ['GN001'] }
];

// Đơn hàng đã hoàn thành: [số ngày trước, [[mã sản phẩm, số lượng], ...]]
// Đơn cũ (> 30 ngày) chỉ tính vào "Bán chạy", đơn mới (<= 30 ngày) tính cả vào "Xu hướng"
const ORDERS = [
    [80, [['GN001', 20], ['TS002', 10], ['TS001', 8]]],
    [70, [['GN001', 15], ['TC005', 6], ['TS002', 5]]],
    [60, [['GN001', 12], ['TS001', 10], ['RC006', 10]]],
    [45, [['TS002', 8], ['TC005', 5], ['RC003', 6]]],
    [20, [['TC001', 6], ['TC007', 4], ['RC004', 5]]],
    [12, [['TC001', 5], ['TC011', 6], ['TC006', 3]]],
    [8, [['TC001', 4], ['TC007', 5], ['RC004', 4]]],
    [5, [['TC011', 4], ['TC006', 4], ['TC004', 3]]],
    [2, [['TC001', 3], ['RC004', 3], ['TC007', 2]]]
];

// ===================== HÀM HỖ TRỢ =====================

// Copy ảnh từ seed/images vào uploads/<folder> và lưu vào bảng files, trả về file_id
const saveImage = async (connection, uploadsRoot, folder, imageName, copiedFiles) => {
    const targetFolder = path.join(uploadsRoot, folder);
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
    }

    const fileName = `seed-${imageName}`;
    const targetPath = path.join(targetFolder, fileName);
    fs.copyFileSync(path.join(IMAGE_FOLDER, imageName), targetPath);
    copiedFiles.push(targetPath);

    const [result] = await connection.execute(
        'INSERT INTO files (owner_id, file_name, mime_type, url) VALUES (NULL, ?, ?, ?)',
        [imageName, 'image/png', `uploads/${folder}/${fileName}`]
    );
    return result.insertId;
};

const addHours = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

// ===================== TẠO DỮ LIỆU =====================

const seedDemoData = async ({ uploadsRoot = path.resolve('uploads') } = {}) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const copiedFiles = []; // Lỗi giữa chừng thì xóa các ảnh đã copy

    try {
        const [[counts]] = await connection.execute(
            'SELECT (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM categories) AS categories'
        );
        if (counts.products > 0 || counts.categories > 0) {
            throw new Error('DB_NOT_EMPTY');
        }

        // 1. Danh mục
        const categoryIds = {};
        for (const category of CATEGORIES) {
            const fileId = await saveImage(connection, uploadsRoot, 'categories', category.image, copiedFiles);
            const [result] = await connection.execute(
                'INSERT INTO categories (name, slug, image_file_id) VALUES (?, ?, ?)',
                [category.name, category.slug, fileId]
            );
            categoryIds[category.slug] = result.insertId;
        }

        // 2. Chi nhánh
        const [branchResult] = await connection.execute(
            `INSERT INTO branches (code, name, address) VALUES ('CN-HN01', 'AgriFood Smart Hà Nội', 'Cầu Giấy, Hà Nội')`
        );
        const branchId = branchResult.insertId;

        // 3. Sản phẩm + quy cách + ảnh + tồn kho
        const productIds = {};
        const variantOfProduct = {}; // Quy cách rẻ nhất của mỗi sản phẩm, dùng để tạo đơn hàng
        for (const product of PRODUCTS) {
            // Slug giống cách API thêm sản phẩm tạo ra: tên + mã sản phẩm
            const slug = slugify(`${product.name} ${product.code}`, { lower: true, strict: true, locale: 'vi' });
            const [productResult] = await connection.execute(
                `INSERT INTO products (category_id, code, name, slug, description, status, created_at)
                 VALUES (?, ?, ?, ?, ?, 'PUBLISHED', DATE_SUB(NOW(), INTERVAL ? DAY))`,
                [categoryIds[product.category], product.code, product.name, slug,
                    `${product.name} tươi ngon, nguồn gốc rõ ràng, được tuyển chọn mỗi ngày.`, String(product.daysAgo)]
            );
            const productId = productResult.insertId;
            productIds[product.code] = productId;

            const fileId = await saveImage(connection, uploadsRoot, 'products', product.image, copiedFiles);
            await connection.execute(
                'INSERT INTO product_images (product_id, file_id, is_thumbnail) VALUES (?, ?, 1)',
                [productId, fileId]
            );

            for (let i = 0; i < product.variants.length; i++) {
                const [variantName, unit, step, price, stock] = product.variants[i];
                const [variantResult] = await connection.execute(
                    `INSERT INTO product_variants (product_id, sku, name, unit, step_quantity, list_price)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [productId, `${product.code}-${i + 1}`, variantName, unit, step, price]
                );

                if (i === 0) {
                    variantOfProduct[product.code] = { id: variantResult.insertId, price };
                }

                await connection.execute(
                    `INSERT INTO branch_stock (branch_id, variant_id, batch_code, expiry_date, stock_quantity)
                     VALUES (?, ?, 'LO-SEED', DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?)`,
                    [branchId, variantResult.insertId, stock]
                );
            }
        }

        // 4. Khuyến mãi
        for (const promotion of PROMOTIONS) {
            const [promotionResult] = await connection.execute(
                `INSERT INTO promotions
                 (code, name, discount_value, discount_type, promotion_scope, is_flash_sale, min_order_value, valid_from, valid_to)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [promotion.code, promotion.name, promotion.value, promotion.type, promotion.scope,
                    promotion.isFlashSale ? 1 : 0, promotion.minOrder, addHours(promotion.fromHours), addHours(promotion.toHours)]
            );

            for (const productCode of promotion.products) {
                await connection.execute(
                    'INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)',
                    [promotionResult.insertId, productIds[productCode]]
                );
            }
        }

        // 5. Khách hàng mẫu + đơn hàng đã hoàn thành (để tính sản phẩm bán chạy)
        const passwordHash = await bcrypt.hash('Demo@123', 10);
        const [userResult] = await connection.execute(
            `INSERT INTO users (role_id, email, password_hash, full_name, phone, status)
             VALUES ((SELECT id FROM roles WHERE code = 'CUSTOMER'), 'khachhang.demo@agrifood.local', ?, 'Khách hàng demo', NULL, 'ACTIVE')`,
            [passwordHash]
        );
        const customerId = userResult.insertId;
        const shippingAddress = JSON.stringify({ recipient_name: 'Khách hàng demo', phone: '0900000000', address_line: 'Cầu Giấy, Hà Nội' });

        for (let i = 0; i < ORDERS.length; i++) {
            const [daysAgo, items] = ORDERS[i];
            const totalAmount = items.reduce((sum, [code, quantity]) => sum + variantOfProduct[code].price * quantity, 0);

            const [orderResult] = await connection.execute(
                `INSERT INTO orders (code, user_id, branch_id, total_amount, final_amount, status, payment_method,
                                     payment_status, shipping_address, created_at)
                 VALUES (?, ?, ?, ?, ?, 'COMPLETED', 'COD', 'PAID', ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
                [`DEMO-${String(i + 1).padStart(4, '0')}`, customerId, branchId, totalAmount, totalAmount,
                    shippingAddress, String(daysAgo)]
            );

            for (const [code, quantity] of items) {
                await connection.execute(
                    'INSERT INTO order_items (order_id, variant_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderResult.insertId, variantOfProduct[code].id, quantity, variantOfProduct[code].price]
                );
            }
        }

        await connection.commit();

        return {
            categories: CATEGORIES.length,
            products: PRODUCTS.length,
            promotions: PROMOTIONS.length,
            orders: ORDERS.length
        };
    } catch (error) {
        await connection.rollback();
        for (const filePath of copiedFiles) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        throw error;
    } finally {
        connection.release();
    }
};

// Chạy trực tiếp bằng lệnh: node seed/seed-demo.js
if (require.main === module) {
    seedDemoData()
        .then((summary) => {
            console.log('Đã tạo dữ liệu mẫu:', summary);
            process.exit(0);
        })
        .catch((error) => {
            if (error.message === 'DB_NOT_EMPTY') {
                console.log('Database đã có danh mục / sản phẩm, bỏ qua để tránh tạo trùng dữ liệu.');
            } else {
                console.error('Lỗi khi tạo dữ liệu mẫu:', error.message);
            }
            process.exit(1);
        });
}

module.exports = { seedDemoData };
