const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidAddress, isImageUrl } = require('../src/utils/validation.util');

test('Địa chỉ nhận tên, điện thoại, mã tỉnh/xã và ít nhất đường hoặc thôn', () => {
    const address = { recipient_name: ' Nguyễn An ', phone: ' 0912345678 ', province_code: '01', ward_code: 12, hamlet: 'Thôn A' };
    assert.equal(isValidAddress(address), true);
    assert.equal(isValidAddress({ ...address, phone: '+84912345678', hamlet: '', street_address: '12 đường A', is_default: true }), true);
    const invalid = [
        { recipient_name: '' }, { recipient_name: 'a'.repeat(151) }, { recipient_name: 123 },
        { phone: '123' }, { phone: null }, { province_code: 0 }, { province_code: {} },
        { ward_code: -1 }, { ward_code: '1.5' }, { ward_code: [] },
        { hamlet: ' ' }, { street_address: null }, { street_address: 'a'.repeat(301) },
        { hamlet: 'a'.repeat(151) }, { is_default: 'true' }
    ];
    for (const fields of invalid) assert.equal(isValidAddress({ ...address, ...fields }), false, JSON.stringify(fields));
    assert.equal(isValidAddress(), false);
});

test('Link ảnh chấp nhận HTTP(S), kể cả URL CDN có query, từ chối sai kiểu hoặc giao thức', () => {
    assert.equal(isImageUrl('https://cdn.example.com/photo?id=123&size=500'), true);
    assert.equal(isImageUrl('http://localhost:8000/uploads/image.jpg'), true);
    for (const url of ['', null, 123, {}, 'not a url', 'javascript:alert(1)', 'data:image/png;base64,AA==',
        'ftp://example.com/photo.jpg', 'https://user:password@example.com/photo.jpg', 'https://example.com/' + 'x'.repeat(2000)]) {
        assert.equal(isImageUrl(url), false);
    }
});
