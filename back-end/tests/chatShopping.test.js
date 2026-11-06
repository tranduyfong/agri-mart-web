const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getShoppingRequest, getMissingGroups, wantsStaff, isShoppingQuestion } = require('../src/utils/chatShopping.util');
const { getFoodGuidance } = require('../src/utils/foodGuidance.util');
const customer = (content) => ({ sender_type: 'CUSTOMER', content });

test('Nhớ ngân sách/số người và nhóm thực phẩm qua câu bổ sung; bỏ lời của nhân viên', () => {
    const history = [customer('Rau cho 3 người dưới 50 nghìn'), { sender_type: 'STAFF', content: '500k 10 người thịt bò' }, customer('mình muốn có cả thịt nữa')];
    assert.deepEqual(getShoppingRequest(history), { budget: 50000, people: 3, groups: ['VEGETABLE', 'MEAT'] });
    history.push(customer('Tôi muốn tìm thịt cho 3 người dưới 300k'));
    assert.deepEqual(getShoppingRequest(history), { budget: 300000, people: 3, groups: ['MEAT'] });
    assert.equal(getShoppingRequest([customer('Tôi có 50.000đ cho 3 người')]).budget, 50000);
    assert.equal(getShoppingRequest([customer('Ngân sách 1,5 triệu cho 10 người')]).budget, 1500000);
    assert.deepEqual(getShoppingRequest([customer('Mua một bó rau')]).groups, ['VEGETABLE']);
});

test('Phát hiện nhóm còn thiếu, phân biệt bó rau với thịt bò và nhận yêu cầu gặp người thật', () => {
    assert.deepEqual(getMissingGroups([{ name: 'Bó rau cải', category_name: 'Rau lá' }], { groups: ['MEAT', 'VEGETABLE'] }), ['MEAT']);
    assert.deepEqual(getMissingGroups([{ name: 'Thịt heo', category_name: 'Thực phẩm' }, { name: 'Bông cải', category_name: 'Rau lá' }], { groups: ['MEAT', 'VEGETABLE'] }), []);
    assert.equal(wantsStaff('Tôi muốn gặp nhân viên'), true);
    assert.equal(wantsStaff('Tôi tìm thịt dưới 50k'), false);
    assert.equal(isShoppingQuestion('Bữa cơm có thịt và rau cho 5 người'), true);
});

test('Hướng dẫn dinh dưỡng có nguồn, cá thể hóa bệnh thận và không gợi ý nội tạng cho yêu cầu gout', () => {
    const diabetes = getFoodGuidance([customer('Tôi bị tiểu đường cần chọn rau và thịt')]);
    assert.ok(diabetes.notes[0].source.startsWith('https://www.cdc.gov/'));
    assert.match(diabetes.notes[0].advice, /Không bảo kiêng toàn bộ/);
    const kidney = getFoodGuidance([customer('Tôi suy thận đang lọc máu')]);
    assert.match(kidney.notes[0].advice, /bác sĩ/);
    assert.match(kidney.notes[0].advice, /Không tự mặc định/);
    const gout = getFoodGuidance([customer('Tôi bị gout')]);
    assert.equal(gout.allows({ name: 'Gan heo' }), false);
    assert.equal(gout.allows({ name: 'Rau cải' }), true);
});
