// Dùng lại DB tạm/SMTP giả của bộ staff, không kết nối dữ liệu thật.
module.exports = ({ test, assert, api, Product, Order, GoodsReceipt, User, getActors, getBaseUrl }) => {
    const prepare = async (suffix, staffApproval = false) => {
        const { token, adminToken } = getActors();
        const lookups = (await api('/staff/lookups')).data;
        const category = lookups.categories[0];
        const code = 'QA-FEFO-' + suffix;
        const common = { sku: code, code, name: 'Lê cùng quy cách ' + suffix, variant_name: 'Túi 500g', unit: 'túi', step_quantity: 1,
            category_slug: category.slug, image_url: 'https://example.invalid/pear.jpg' };
        const rows = [
            { ...common, batch_code: 'LATE', quantity: 3, unit_cost: 35000, list_price: 60000, expiry_date: '2099-12-03' },
            { ...common, batch_code: 'EARLY', quantity: 2, unit_cost: 30000, list_price: 50000, expiry_date: '2099-11-30' }
        ];
        const preview = (await api('/staff/imports/preview', 'POST', { rows })).data;
        assert.equal(preview.error_rows, 0, JSON.stringify(preview));
        assert.equal(preview.new_skus, 1);
        const imported = (await api('/staff/imports', 'POST', { rows, supplier_id: lookups.suppliers[0].id, import_key: 'qa-lot-import-' + suffix, source_file: 'one-sku.xlsx' },
            staffApproval ? token : adminToken, staffApproval ? 202 : 200)).data;
        if (staffApproval) {
            assert.equal(await Product.countDocuments({ code }), 0);
            const detail = (await api('/admin/product-changes/' + imported.request_id, 'GET', undefined, adminToken)).data;
            assert.deepEqual(detail.rows.map((row) => row.list_price), [60000, 50000]);
            await api('/admin/product-changes/' + imported.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken);
        }
        const product = await Product.findOne({ code });
        assert.equal(product.variants.length, 1);
        assert.equal(product.variants[0].stocks.length, 2);
        await api('/product/' + product.id, 'PUT', { status: 'PUBLISHED' }, adminToken);
        return await Product.findById(product._id);
    };

    test('Cùng SKU nhập hai hạn/giá qua duyệt; giỏ, mua ngay, coupon, giá vốn và hoàn kho đều theo đúng lô', async () => {
        const { customer, customerToken, adminToken } = getActors();
        const product = await prepare('FLOW', true);
        const variant = { ...product.variants[0].toObject(), id: product.variants[0]._id.toString() };
        const detail = (await api('/product/' + product.slug, 'GET', undefined, customerToken)).data;
        assert.equal(detail.variants[0].list_price, 50000);
        assert.deepEqual(detail.variants[0].sale_lots.map((lot) => lot.list_price), [50000, 60000]);
        assert.equal(detail.variants[0].stock_quantity, 5);
        const catalog = await require('../src/services/chatAi.services').getRecommendations([{ variant_id: variant.id, quantity: 3 }]);
        assert.equal(catalog[0].price, 50000);
        assert.equal(catalog[0].line_total, 160000);
        const filtered = (await api('/product?keyword=' + product.code + '&min_price=49000&max_price=51000')).data;
        assert.ok(filtered.some((item) => item.id === product.id && item.min_price === 50000));
        await api('/cart/items', 'POST', { variant_id: variant.id, quantity: 3 }, customerToken);
        const cart = (await api('/cart', 'GET', undefined, customerToken)).data.filter((item) => item.variant_id === variant.id);
        assert.equal(cart.length, 1);
        assert.equal(cart[0].line_total, 160000);
        const buy_now = { variant_id: variant.id, quantity: 3 };
        const plain = (await api('/order/preview', 'POST', { buy_now, checkout_key: 'qa-lot-plain-preview' }, customerToken)).data;
        const fromCart = (await api('/order/preview', 'POST', { cart_item_ids: [cart[0].id], checkout_key: 'qa-lot-cart-preview' }, customerToken)).data;
        assert.equal(plain.subtotal, 160000);
        assert.equal(fromCart.total, plain.total);
        assert.equal(plain.items.length, 1);
        await api('/staff/promotions', 'POST', { code: 'QA-LOT-COUPON', name: 'Giảm theo lô', promotion_scope: 'PRODUCT',
            discount_type: 'PERCENT', discount_value: 10, min_order_value: 155000, requires_code: true,
            valid_from: '2000-01-01', valid_to: '2099-12-31', product_ids: [product.id] });
        const preview = (await api('/order/preview', 'POST', { buy_now, coupon_code: 'QA-LOT-COUPON', checkout_key: 'qa-lot-coupon-preview' }, customerToken)).data;
        assert.equal(preview.coupon.discount_amount, 16000);
        const checkout_key = 'qa-lot-checkout-flow';
        const placed = (await api('/order/checkout', 'POST', { buy_now, checkout_key, address_id: customer.addresses[0]._id.toString(),
            recipient_name: 'Khách theo lô', phone: '0900000001', email: customer.email, payment_method: 'VNPAY',
            coupon_code: 'QA-LOT-COUPON', expected_total: preview.total }, customerToken, 201)).data;
        const created = (await api('/order/' + placed.checkout_code, 'GET', undefined, customerToken)).data;
        assert.equal(created.total, preview.total);
        assert.equal(created.items.length, 1);
        assert.equal(created.items[0].line_total, 160000);
        assert.deepEqual(created.items[0].price_breakdown.map((lot) => [lot.batch_code, lot.quantity, lot.price]), [['EARLY', 2, 50000], ['LATE', 1, 60000]]);
        const order = await Order.findOne({ checkout_key });
        const cost = require('../src/utils/report.util').getOrderCost(order, await GoodsReceipt.find().lean());
        assert.equal(cost.amount, 95000);
        assert.equal(cost.missing, 0);
        assert.equal((await api('/product/' + product.slug)).data.variants[0].list_price, 60000);
        await api('/order/' + created.checkout_code + '/payment-url', 'POST', {}, customerToken, 409);
        await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'PENDING', status: 'CONFIRMED', note: '' });
        await api('/order/' + created.checkout_code + '/payment-url', 'POST', {}, customerToken);
        const staffView = (await api('/staff/orders/' + order.id)).data;
        assert.equal(staffView.items[0].line_total, 160000);
        await api('/staff/orders/' + order.id + '/status', 'PATCH', { expected_status: 'CONFIRMED', status: 'CANCELLED', note: 'Khách đổi ý' });
        const restored = await Product.findById(product.id);
        assert.deepEqual(restored.variants[0].stocks.map((lot) => [lot.batch_code, lot.quantity, lot.list_price]), [['LATE', 3, 60000], ['EARLY', 2, 50000]]);
        assert.equal((await api('/product/' + product.slug)).data.variants[0].list_price, 50000);
        // Sửa giá lô không làm thay đổi đơn đã chốt.
        await api('/product/' + product.id, 'PUT', { variants: [{ id: variant.id, sku: variant.sku, variant_name: variant.name,
            unit: variant.unit, step_quantity: 1, list_price: variant.list_price, lot_prices: [{ batch_code: 'EARLY', list_price: 45000 }] }] }, adminToken);
        const historical = (await api('/order/' + created.checkout_code, 'GET', undefined, customerToken)).data;
        assert.equal(historical.items[0].line_total, 160000);
        assert.equal(historical.items[0].price_breakdown[0].price, 50000);
        await User.updateOne({ _id: customer._id }, { $pull: { cart_items: { variant_id: variant._id } } });
    });

    test('Giá lô sửa bởi nhân viên cần admin duyệt; giá đổi sau preview chặn đặt đơn và không trừ kho', async () => {
        const { customer, customerToken, adminToken, token } = getActors();
        const product = await prepare('PRICE');
        const variant = { ...product.variants[0].toObject(), id: product.variants[0]._id.toString() };
        const buy_now = { variant_id: variant.id, quantity: 3 };
        const preview = (await api('/order/preview', 'POST', { buy_now, checkout_key: 'qa-lot-price-preview' }, customerToken)).data;
        const values = { variants: [{ id: variant.id, sku: variant.sku, variant_name: variant.name, unit: 'túi', step_quantity: 1,
            list_price: variant.list_price, lot_prices: [{ batch_code: 'EARLY', list_price: 40000 }] }] };
        const pending = (await api('/staff/products/' + product.id, 'PUT', values, token, 202)).data;
        assert.equal((await api('/product/' + product.slug)).data.variants[0].list_price, 50000);
        const proposal = (await api('/admin/product-changes/' + pending.request_id, 'GET', undefined, adminToken)).data;
        assert.equal(proposal.after.variants[0].lot_prices.find((lot) => lot.batch_code === 'EARLY').list_price, 40000);
        await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken);
        assert.equal((await api('/product/' + product.slug)).data.variants[0].list_price, 40000);
        const checkout_key = 'qa-lot-price-changed';
        const result = await api('/order/checkout', 'POST', { buy_now, checkout_key, address_id: customer.addresses[0]._id.toString(),
            recipient_name: 'Khách theo lô', phone: '0900000001', email: customer.email, payment_method: 'COD', expected_total: preview.total }, customerToken, 409);
        assert.equal(result.code, 'CART_CHANGED');
        assert.equal(await Order.countDocuments({ checkout_key }), 0);
        assert.equal((await Product.findById(product.id)).variants[0].stocks.reduce((sum, lot) => sum + lot.quantity, 0), 5);
        const invalid = (await api('/staff/imports/preview', 'POST', { rows: [{ sku: variant.sku, quantity: 1, unit_cost: 30000,
            batch_code: 'EARLY', expiry_date: '2099-11-30', list_price: 12345 }] })).data;
        assert.equal(invalid.error_rows, 1);
    });

    test('Hai khách đặt đồng thời không bán vượt tồn và không tính toàn bộ theo giá lô đầu', async () => {
        const { customer, customerToken } = getActors();
        const product = await prepare('RACE');
        const body = { buy_now: { variant_id: String(product.variants[0]._id), quantity: 3 },
            address_id: String(customer.addresses[0]._id), recipient_name: 'Khách đồng thời', phone: '0900000001',
            email: customer.email, payment_method: 'COD', expected_total: 175000 };
        const responses = await Promise.all([0, 1].map((index) => fetch(getBaseUrl() + '/order/checkout', {
            method: 'POST', headers: { Authorization: 'Bearer ' + customerToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, checkout_key: 'qa-lot-race-order-' + index })
        })));
        assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
        const orders = await Order.find({ checkout_key: { $in: ['qa-lot-race-order-0', 'qa-lot-race-order-1'] } });
        assert.equal(orders.length, 1);
        assert.equal(orders[0].items[0].line_total, 160000);
        const saved = await Product.findById(product.id);
        assert.deepEqual(saved.variants[0].stocks.map((lot) => [lot.batch_code, lot.quantity]), [['LATE', 2], ['EARLY', 0]]);
    });

    test('Thống kê nhà cung cấp chỉ tăng khi phiếu nhập được duyệt, giữ riêng lượng theo đơn vị', async () => {
        const { adminToken, token } = getActors();
        const supplier = (await api('/admin/suppliers', 'POST', { code: 'QA-NCC-PENDING', name: 'Nhà cung cấp chờ duyệt' }, adminToken, 201)).data;
        const product = await Product.findOne({ code: 'DEMO-SP001' });
        const pending = (await api('/staff/imports', 'POST', { supplier_id: supplier.id, import_key: 'qa-supplier-approve-import', source_file: 'supplier.xlsx',
            rows: [{ sku: product.variants[0].sku, quantity: 2, unit_cost: 10000, batch_code: 'QA-NCC-LOT', expiry_date: '2099-12-31' }] }, token, 202)).data;
        assert.equal((await api('/admin/suppliers/' + supplier.id, 'GET', undefined, adminToken)).data.total_amount, 0);
        await api('/admin/product-changes/' + pending.request_id + '/review', 'PATCH', { status: 'APPROVED', note: '' }, adminToken);
        const detail = (await api('/admin/suppliers/' + supplier.id, 'GET', undefined, adminToken)).data;
        assert.equal(detail.receipt_count, 1);
        assert.equal(detail.total_amount, 20000);
        assert.equal(detail.units[0].quantity, 2);
        assert.equal(detail.units[0].unit, product.variants[0].unit);
        const items = await api('/admin/suppliers/' + supplier.id + '/items', 'GET', undefined, adminToken);
        assert.equal(items.totalElements, 1);
        assert.equal(items.data[0].total_amount, 20000);
    });
};
