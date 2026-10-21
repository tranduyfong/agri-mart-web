const API_URL = 'https://provinces.open-api.vn/api/v2';

// API v2 dùng tỉnh/thành phố và phường/xã theo địa giới mới, không qua quận/huyện.
const getProvinces = async () => {
    try {
        const response = await fetch(API_URL + '/p/', { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('ADDRESS_API_UNAVAILABLE');

        const provinces = await response.json();
        if (!Array.isArray(provinces) || !provinces.length) throw new Error('ADDRESS_API_UNAVAILABLE');

        return provinces.map((province) => ({ code: province.code, name: province.name }));
    } catch {
        throw new Error('ADDRESS_API_UNAVAILABLE');
    }
};

const getWardsByProvince = async (provinceCode) => {
    if (!/^\d+$/.test(String(provinceCode)) || Number(provinceCode) <= 0) {
        throw new Error('INVALID_ADDRESS_CODE');
    }

    let response;
    try {
        response = await fetch(API_URL + '/p/' + Number(provinceCode) + '?depth=2', {
            signal: AbortSignal.timeout(8000)
        });
    } catch {
        throw new Error('ADDRESS_API_UNAVAILABLE');
    }

    if (response.status === 404) throw new Error('PROVINCE_NOT_FOUND');
    if (!response.ok) throw new Error('ADDRESS_API_UNAVAILABLE');

    try {
        const province = await response.json();
        if (Number(province.code) !== Number(provinceCode) || !Array.isArray(province.wards) || !province.wards.length) {
            throw new Error('ADDRESS_API_UNAVAILABLE');
        }

        return province.wards.map((ward) => ({ code: ward.code, name: ward.name }));
    } catch {
        throw new Error('ADDRESS_API_UNAVAILABLE');
    }
};

const resolveAddress = async ({ province_code, ward_code, street_address = '', hamlet = '' }) => {
    const provinces = await getProvinces();
    const province = provinces.find((item) => item.code === Number(province_code));
    if (!province) throw new Error('PROVINCE_NOT_FOUND');

    const wards = await getWardsByProvince(province.code);
    const ward = wards.find((item) => item.code === Number(ward_code));
    if (!ward) throw new Error('WARD_NOT_FOUND');

    // Lưu tên do API trả về, cùng mã tỉnh/xã và phần địa chỉ chi tiết.
    return {
        province_code: province.code,
        province_name: province.name,
        ward_code: ward.code,
        ward_name: ward.name,
        street_address: street_address.trim(),
        hamlet: hamlet.trim(),
        address_line: [street_address.trim(), hamlet.trim(), ward.name, province.name].filter(Boolean).join(', ')
    };
};

module.exports = { getProvinces, getWardsByProvince, resolveAddress };
