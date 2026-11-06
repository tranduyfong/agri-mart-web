module.exports = ({ test, assert, api, User, Product, GoodsReceipt, getAdmin, sign }) => {
    test('Admin thêm/xem/sửa nhà cung cấp; chặn mã trùng và nhân viên/khách truy cập quản lý', async () => {
        const staff = await User.create({ email: 'supplier-staff@example.invalid', full_name: 'Nhân viên NCC', password_hash: 'unused', role: 'STAFF', status: 'ACTIVE' });
        const customer = await User.create({ email: 'supplier-customer@example.invalid', full_name: 'Khách NCC', password_hash: 'unused', role: 'CUSTOMER', status: 'ACTIVE' });
        await api('/admin/suppliers', 'GET', undefined, sign(staff), 403);
        await api('/admin/suppliers', 'POST', { code: 'FORBIDDEN', name: 'Không được tạo' }, sign(customer), 403);
        const supplier = (await api('/admin/suppliers', 'POST', { code: 'qa-supplier', name: 'Nông trại thử', phone: '0900000001' }, undefined, 201)).data;
        assert.equal(supplier.code, 'QA-SUPPLIER');
        assert.equal(supplier.total_amount, 0);
        await api('/admin/suppliers', 'POST', { code: 'QA-SUPPLIER', name: 'Trùng mã' }, undefined, 409);
        await api('/admin/suppliers', 'POST', { code: 'BAD', name: ' ' }, undefined, 400);
        await api('/admin/suppliers/not-an-id', 'GET', undefined, undefined, 404);
        const saved = (await api('/admin/suppliers/' + supplier.id, 'PUT', { code: 'QA-SUPPLIER', name: 'Nông trại mới', phone: '' })).data;
        assert.equal(saved.phone, null);
        assert.equal((await api('/admin/suppliers?keyword=Nông%20trại%20mới')).data[0].id, supplier.id);
        const product = await Product.findOne({ code: 'DEMO-SP001' });
        await GoodsReceipt.create([
            { supplier_id: supplier.id, created_by: getAdmin().id, total_amount: 55000, items: [
                { product_id: product.id, name: 'Hàng theo kg', unit: 'kg', variant_sku: 'QA-NCC-KG', batch_code: 'KG', quantity: 1.5, unit_cost: 10000, expiry_date: '2099-12-31' },
                { product_id: product.id, name: 'Hàng theo túi', unit: 'túi', variant_sku: 'QA-NCC-TUI', batch_code: 'TUI', quantity: 2, unit_cost: 20000, expiry_date: '2099-12-31' }
            ] },
            { supplier_id: supplier.id, created_by: getAdmin().id, total_amount: 20000, items: [
                { product_id: product.id, name: 'Hàng theo kg', unit: 'kg', variant_sku: 'QA-NCC-KG', batch_code: 'KG2', quantity: 2, unit_cost: 10000, expiry_date: '2099-12-31' }
            ] }
        ]);
        const detail = (await api('/admin/suppliers/' + supplier.id)).data;
        assert.equal(detail.receipt_count, 2);
        assert.equal(detail.total_amount, 75000);
        assert.equal(detail.units.find(row => row.unit === 'kg').quantity, 3.5);
        assert.equal(detail.units.find(row => row.unit === 'túi').quantity, 2);
        const items = await api('/admin/suppliers/' + supplier.id + '/items?pageSize=1');
        assert.equal(items.totalElements, 2);
        assert.equal(items.data.length, 1);
        assert.equal(items.data[0].quantity, 3.5);
        const list = await api('/admin/suppliers?keyword=QA-SUPPLIER');
        assert.equal(list.data[0].total_amount, 75000);
        assert.equal(list.data[0].receipt_count, 2);
        await api('/admin/suppliers/' + supplier.id, 'PUT', { code: 'QA-SUPPLIER', name: 'Tên đã đổi', phone: '0900000002' });
        assert.equal((await api('/admin/suppliers/' + supplier.id)).data.total_amount, 75000);
    });
};
