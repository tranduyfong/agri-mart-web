const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connection = require('./src/configs/database.config');
const User = require('./src/models/user');
const Category = require('./src/models/category');
const Supplier = require('./src/models/supplier');
const Product = require('./src/models/product');
const Promotion = require('./src/models/promotion');
const Order = require('./src/models/order');
const GoodsReceipt = require('./src/models/goodsReceipt');
const ChatRoom = require('./src/models/chatRoom');
const ChatMessage = require('./src/models/chatMessage');
const Newsletter = require('./src/models/newsletter');

const getDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const categories = [
    { name: 'Rau lá', slug: 'demo-rau-la', image: 'leafy_green' },
    { name: 'Củ và quả', slug: 'demo-cu-qua', image: 'carrot' },
    { name: 'Trái cây', slug: 'demo-trai-cay', image: 'strawberry' },
    { name: 'Thịt tươi', slug: 'demo-thit-tuoi', image: 'cut_of_meat' },
    { name: 'Thủy hải sản', slug: 'demo-thuy-hai-san', image: 'fish' },
    { name: 'Trứng', slug: 'demo-trung', image: 'egg' },
    { name: 'Sữa', slug: 'demo-sua', image: 'glass_of_milk' },
    { name: 'Gạo và ngũ cốc', slug: 'demo-ngu-coc', image: 'sheaf_of_rice' },
    { name: 'Bánh', slug: 'demo-banh', image: 'bread' },
    { name: 'Nấm', slug: 'demo-nam', image: 'mushroom' },
    { name: 'Gia vị', slug: 'demo-gia-vi', image: 'hot_pepper' },
    { name: 'Đồ uống', slug: 'demo-do-uong', image: 'beverage_box' }
];

const products = [
    { name: 'Dâu tây Đà Lạt', category: 'demo-trai-cay', price: 120000, unit: 'kg', image: 'strawberry', has_pack: true },
    { name: 'Táo đỏ', category: 'demo-trai-cay', price: 65000, unit: 'kg', image: 'red_apple' },
    { name: 'Chuối chín', category: 'demo-trai-cay', price: 25000, unit: 'kg', image: 'banana' },
    { name: 'Xoài cát', category: 'demo-trai-cay', price: 45000, unit: 'kg', image: 'mango' },
    { name: 'Nho tím', category: 'demo-trai-cay', price: 95000, unit: 'kg', image: 'grapes' },
    { name: 'Dứa tươi', category: 'demo-trai-cay', price: 22000, unit: 'quả', image: 'pineapple' },
    { name: 'Cà chua Đà Lạt', category: 'demo-cu-qua', price: 30000, unit: 'kg', image: 'tomato', has_pack: true },
    { name: 'Cà rốt', category: 'demo-cu-qua', price: 28000, unit: 'kg', image: 'carrot' },
    { name: 'Bông cải xanh', category: 'demo-rau-la', price: 42000, unit: 'kg', image: 'broccoli', has_pack: true },
    { name: 'Cải xanh', category: 'demo-rau-la', price: 18000, unit: 'bó', image: 'leafy_green' },
    { name: 'Khoai tây', category: 'demo-cu-qua', price: 32000, unit: 'kg', image: 'potato' },
    { name: 'Dưa chuột', category: 'demo-cu-qua', price: 25000, unit: 'kg', image: 'cucumber', out_of_stock: true },
    { name: 'Cá tươi', category: 'demo-thuy-hai-san', price: 85000, unit: 'kg', image: 'fish' },
    { name: 'Tôm tươi', category: 'demo-thuy-hai-san', price: 180000, unit: 'kg', image: 'shrimp', has_pack: true },
    { name: 'Thịt heo sạch', category: 'demo-thit-tuoi', price: 115000, unit: 'kg', image: 'cut_of_meat', has_pack: true },
    { name: 'Đùi gà', category: 'demo-thit-tuoi', price: 75000, unit: 'kg', image: 'poultry_leg' },
    { name: 'Trứng gà hộp 10 quả', category: 'demo-trung', price: 35000, unit: 'hộp', image: 'egg' },
    { name: 'Sữa tươi nguyên kem 1 lít', category: 'demo-sua', price: 38000, unit: 'hộp', image: 'glass_of_milk' },
    { name: 'Gạo thơm túi 5 kg', category: 'demo-ngu-coc', price: 135000, unit: 'túi', image: 'sheaf_of_rice' },
    { name: 'Bánh mì nguyên cám', category: 'demo-banh', price: 25000, unit: 'ổ', image: 'bread' },
    { name: 'Nấm tươi gói 200g', category: 'demo-nam', price: 22000, unit: 'gói', image: 'mushroom' },
    { name: 'Ngô ngọt', category: 'demo-cu-qua', price: 10000, unit: 'bắp', image: 'ear_of_corn' },
    { name: 'Ớt tươi gói 100g', category: 'demo-gia-vi', price: 8000, unit: 'gói', image: 'hot_pepper' },
    { name: 'Nước trái cây hộp 250ml', category: 'demo-do-uong', price: 12000, unit: 'hộp', image: 'beverage_box' },
    { name: 'Xoài xanh (bản nháp)', category: 'demo-trai-cay', price: 30000, unit: 'kg', image: 'mango', status: 'DRAFT' },
    { name: 'Sữa tươi (ngừng bán)', category: 'demo-sua', price: 32000, unit: 'hộp', image: 'glass_of_milk', status: 'ARCHIVED' }
];

const seedData = async () => {
    await connection();

    // Chờ tạo unique index trước khi thêm dữ liệu.
    await Promise.all([User.init(), Category.init(), Supplier.init(), Product.init(), Promotion.init(), Order.init(), GoodsReceipt.init()]);

    // Ảnh nằm sẵn trong dự án, không cần tải từ Internet khi chạy seed.
    const imageDirectory = path.join(__dirname, 'uploads/products/demo');
    fs.mkdirSync(imageDirectory, { recursive: true });

    for (const file of fs.readdirSync(path.join(__dirname, 'seed-images'))) {
        const destination = path.join(imageDirectory, file);
        if (!fs.existsSync(destination)) {
            fs.copyFileSync(path.join(__dirname, 'seed-images', file), destination);
        }
    }

    let supplier = await Supplier.findOne({ code: 'DEMO-NCC01' });
    if (!supplier) {
        supplier = await Supplier.create({
            code: 'DEMO-NCC01',
            name: 'Nông trại AgriFood (demo)',
            phone: '0900000099'
        });
    }

    const savedCategories = {};
    for (const data of categories) {
        let category = await Category.findOne({ slug: data.slug });
        if (!category) {
            category = await Category.create({
                name: data.name,
                slug: data.slug,
                image_url: 'uploads/products/demo/' + data.image + '.png'
            });
        }
        savedCategories[data.slug] = category;
    }

    const savedProducts = [];
    for (let index = 0; index < products.length; index++) {
        const data = products[index];
        const code = 'DEMO-SP' + String(index + 1).padStart(3, '0');
        let product = await Product.findOne({ code });

        if (!product) {
            const variants = [
                {
                    sku: code + '-01',
                    name: data.unit === 'kg' ? 'Bán theo kg' : '1 ' + data.unit,
                    unit: data.unit,
                    step_quantity: data.unit === 'kg' ? 0.5 : 1,
                    list_price: data.price,
                    stocks: []
                }
            ];

            if (data.has_pack) {
                variants.push({
                    sku: code + '-02',
                    name: 'Khay 500g',
                    unit: 'khay',
                    step_quantity: 1,
                    list_price: Math.round((data.price * 0.55) / 1000) * 1000,
                    stocks: []
                });
            }

            for (const variant of variants) {
                variant.stocks.push({
                    batch_code: 'LO-DEMO-MOI',
                    quantity: data.out_of_stock ? 0 : 30 + index,
                    manufactured_date: getDate(-2),
                    expiry_date: getDate(30)
                });
            }

            // Một lô đã hết hạn để thử việc loại lô cũ khi tính tồn kho.
            if (index === 0) {
                variants[0].stocks.push({
                    batch_code: 'LO-DEMO-HET-HAN',
                    quantity: 5,
                    manufactured_date: getDate(-40),
                    expiry_date: getDate(-1)
                });
            }

            product = await Product.create({
                category_id: savedCategories[data.category]._id,
                code,
                name: data.name,
                slug: slugify(data.name + ' ' + code, { lower: true, strict: true, locale: 'vi' }),
                description:
                    data.name +
                    ' được chọn lọc, phù hợp cho bữa ăn hằng ngày. ' +
                    'Bảo quản ở nơi phù hợp với từng loại thực phẩm và sử dụng trước hạn ghi trên bao bì. ' +
                    'Đây là sản phẩm mẫu để thử chức năng của AgriFood Smart.',
                status: data.status || 'PUBLISHED',
                images: ['uploads/products/demo/' + data.image + '.png'],
                variants
            });
        }

        savedProducts.push(product);
    }

    const addresses = [
        {
            recipient_name: 'Nguyễn Minh Anh',
            phone: '0900000001',
            province_code: 1,
            province_name: 'Thành phố Hà Nội',
            ward_code: 4,
            ward_name: 'Phường Ba Đình',
            street_address: '12 Đội Cấn',
            hamlet: 'Tổ dân phố số 1',
            address_line: '12 Đội Cấn, Tổ dân phố số 1, Phường Ba Đình, Thành phố Hà Nội',
            is_default: true
        },
        {
            recipient_name: 'Nguyễn Minh Anh',
            phone: '0900000001',
            province_code: 1,
            province_name: 'Thành phố Hà Nội',
            ward_code: 8,
            ward_name: 'Phường Ngọc Hà',
            street_address: '25 Ngọc Hà',
            hamlet: 'Tổ dân phố số 2',
            address_line: '25 Ngọc Hà, Tổ dân phố số 2, Phường Ngọc Hà, Thành phố Hà Nội',
            is_default: false
        }
    ];

    const passwordHash = await bcrypt.hash('Demo@123', 10);
    const users = {};
    const userData = [
        { email: 'admin.demo@agrimart.local', full_name: 'Quản trị viên Demo', role: 'ADMIN' },
        { email: 'staff.demo@agrimart.local', full_name: 'Nhân viên Demo', role: 'STAFF' },
        { email: 'customer.demo@agrimart.local', full_name: 'Nguyễn Minh Anh', role: 'CUSTOMER' }
    ];

    for (const data of userData) {
        let user = await User.findOne({ email: data.email });
        if (!user) {
            user = await User.create({
                ...data,
                password_hash: passwordHash,
                status: 'ACTIVE',
                email_verified_at: new Date(),
                permissions:
                    data.role === 'STAFF'
                        ? [
                              'PRODUCT_MANAGE',
                              'INVENTORY_MANAGE',
                              'ORDER_MANAGE',
                              'PROMOTION_MANAGE',
                              'BANNER_MANAGE',
                              'NEWSLETTER_MANAGE',
                              'SUPPORT_MANAGE'
                          ]
                        : [],
                addresses: data.role === 'CUSTOMER' ? addresses : [],
                wishlist: data.role === 'CUSTOMER' ? [savedProducts[0]._id, savedProducts[8]._id] : [],
                cart_items:
                    data.role === 'CUSTOMER'
                        ? [
                              { product_id: savedProducts[0]._id, variant_id: savedProducts[0].variants[0]._id, quantity: 1 },
                              { product_id: savedProducts[17]._id, variant_id: savedProducts[17].variants[0]._id, quantity: 2 }
                          ]
                        : []
            });
        }
        users[data.role] = user;
    }

    // Bổ sung các quyền mới cho riêng tài khoản nhân viên demo đã tồn tại.
    await User.updateOne(
        { email: 'staff.demo@agrimart.local', role: 'STAFF' },
        { $addToSet: { permissions: { $each: ['PROMOTION_MANAGE', 'BANNER_MANAGE', 'NEWSLETTER_MANAGE', 'SUPPORT_MANAGE'] } } }
    );
    if (!(await Newsletter.exists({ subject: 'DEMO - Ưu đãi rau tươi cuối tuần' }))) {
        await Newsletter.create({
            subject: 'DEMO - Ưu đãi rau tươi cuối tuần',
            content: 'Xin chào bạn,\n\nKhám phá **rau củ tươi** và các ưu đãi mới tại Agri-Mart.',
            created_by: users.STAFF._id
        });
    }
    if (!(await ChatRoom.exists({ customer_id: users.CUSTOMER._id }))) {
        const room = await ChatRoom.create({ customer_id: users.CUSTOMER._id });
        await ChatMessage.create({
            room_id: room._id,
            sender_type: 'CUSTOMER',
            sender_id: users.CUSTOMER._id,
            content: 'Đây là hội thoại mẫu. Mình muốn được tư vấn cách bảo quản rau tươi.'
        });
    }

    const promotionData = [
        {
            code: 'DEMO-FLASH20',
            name: 'Nông sản tươi mỗi ngày',
            discount_type: 'PERCENT',
            discount_value: 20,
            is_flash_sale: true,
            valid_from: getDate(-1),
            valid_to: getDate(7),
            product_ids: [savedProducts[0]._id, savedProducts[6]._id, savedProducts[8]._id]
        },
        {
            code: 'DEMO-FRUIT10',
            name: 'Ưu đãi trái cây',
            discount_type: 'PERCENT',
            discount_value: 10,
            valid_from: getDate(-1),
            valid_to: getDate(30),
            product_ids: savedProducts.slice(1, 6).map((product) => product._id)
        },
        {
            code: 'DEMO-SHIP15',
            name: 'Hỗ trợ phí giao hàng',
            discount_type: 'AMOUNT',
            discount_value: 15000,
            promotion_scope: 'SHIPPING',
            min_order_value: 200000,
            valid_from: getDate(-1),
            valid_to: getDate(30),
            product_ids: []
        },
        {
            code: 'DEMO-EXPIRED',
            name: 'Khuyến mãi đã hết hạn',
            discount_type: 'PERCENT',
            discount_value: 50,
            valid_from: getDate(-30),
            valid_to: getDate(-2),
            product_ids: [savedProducts[0]._id]
        },
        {
            code: 'DEMO-GIAM10',
            name: 'Giảm thêm 10% tiền hàng',
            discount_type: 'PERCENT',
            discount_value: 10,
            requires_code: true,
            min_order_value: 100000,
            valid_from: getDate(-1),
            valid_to: getDate(30),
            product_ids: []
        },
        {
            code: 'DEMO-GIAM30',
            name: 'Giảm 30.000đ tiền hàng',
            discount_type: 'AMOUNT',
            discount_value: 30000,
            requires_code: true,
            min_order_value: 300000,
            valid_from: getDate(-1),
            valid_to: getDate(30),
            product_ids: []
        }
    ];

    for (const data of promotionData) {
        if (!(await Promotion.exists({ code: data.code }))) await Promotion.create(data);
    }

    // Đơn hoàn tất giúp thử bộ lọc bán chạy và xu hướng trên trang chủ.
    const orderData = [
        { code: 'DEMO-DH001', days: -3, productIndexes: [0, 6], quantities: [6, 3] },
        { code: 'DEMO-DH002', days: -10, productIndexes: [8, 17], quantities: [4, 5] },
        { code: 'DEMO-DH003', days: -45, productIndexes: [0, 1], quantities: [2, 8] }
    ];

    for (const data of orderData) {
        if (await Order.exists({ code: data.code })) continue;

        const items = data.productIndexes.map((productIndex, index) => {
            const product = savedProducts[productIndex];
            const variant = product.variants[0];
            return {
                product_id: product._id,
                variant_id: variant._id,
                variant_sku: variant.sku,
                quantity: data.quantities[index],
                price: variant.list_price
            };
        });
        const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);

        await Order.create({
            code: data.code,
            user_id: users.CUSTOMER._id,
            total_amount: totalAmount,
            shipping_fee: 15000,
            discount_amount: 0,
            final_amount: totalAmount + 15000,
            status: 'COMPLETED',
            payment_method: 'COD',
            payment_status: 'PAID',
            shipping_address: addresses[0],
            items,
            created_at: getDate(data.days)
        });
    }

    if (!(await GoodsReceipt.exists({ note: 'DEMO - Phiếu nhập dữ liệu mẫu' }))) {
        const note = 'DEMO - Phiếu nhập dữ liệu mẫu';

        const items = [];
        for (const product of savedProducts) {
            for (const variant of product.variants) {
                for (const stock of variant.stocks) {
                    if (stock.quantity <= 0) continue;

                    items.push({
                        product_id: product._id,
                        variant_sku: variant.sku,
                        batch_code: stock.batch_code,
                        quantity: stock.quantity,
                        unit_cost: Math.round(variant.list_price * 0.6),
                        manufactured_date: stock.manufactured_date,
                        expiry_date: stock.expiry_date
                    });
                }
            }
        }

        await GoodsReceipt.create({
            supplier_id: supplier._id,
            created_by: users.ADMIN._id,
            total_amount: items.reduce((total, item) => total + item.quantity * item.unit_cost, 0),
            note,
            items
        });
    }

    console.log('Đã nạp dữ liệu mẫu: 12 danh mục, 26 sản phẩm, một kho chung, 6 khuyến mãi và 3 đơn hàng.');
    console.log('Khách hàng: customer.demo@agrimart.local');
    console.log('Nhân viên: staff.demo@agrimart.local');
    console.log('Quản trị viên: admin.demo@agrimart.local');
    console.log('Mật khẩu ban đầu của các tài khoản: Demo@123');
    console.log('Chạy lại chỉ bổ sung dữ liệu còn thiếu, không đặt lại mật khẩu hoặc ghi đè dữ liệu đã có.');
};

seedData()
    .catch((error) => {
        console.error('Không thể nạp dữ liệu mẫu:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
