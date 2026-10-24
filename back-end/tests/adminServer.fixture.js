// Dữ liệu địa chỉ cố định để kiểm thử không phụ thuộc API bên ngoài.
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    if (String(url) === 'https://provinces.open-api.vn/api/v2/p/') return Response.json([{ code: 1, name: 'Thành phố Hà Nội' }]);
    if (String(url) === 'https://provinces.open-api.vn/api/v2/p/1?depth=2')
        return Response.json({
            code: 1,
            name: 'Thành phố Hà Nội',
            wards: [
                { code: 1, name: 'Phường Ba Đình' },
                { code: 2, name: 'Phường Ngọc Hà' }
            ]
        });
    return originalFetch(url, options);
};
require('./staffServer.fixture');
