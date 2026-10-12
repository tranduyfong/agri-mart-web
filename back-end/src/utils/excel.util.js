const xlsx = require('xlsx');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

/**
 * Đọc sheet đầu tiên của file Excel thành mảng object. Trả về null nếu file bị lỗi
 */
const readExcelFile = (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return xlsx.utils.sheet_to_json(sheet);
    } catch (error) {
        return null;
    }
};

/**
 * Lấy giá trị dạng chuỗi của 1 ô (ô trống trả về null)
 */
const getText = (value) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    return String(value).trim();
};

/**
 * Lấy giá trị dạng số của 1 ô (ô trống trả về null, sai định dạng trả về NaN)
 */
const getNumber = (value) => {
    const text = getText(value);
    return text === null ? null : Number(text);
};

/**
 * Lấy giá trị ngày (YYYY-MM-DD) của 1 ô. Trả về null nếu ô trống hoặc sai định dạng
 * Ô ngày trong Excel có thể là số (kiểu Date của Excel) hoặc chuỗi "20/10/2026", "2026-10-20"
 */
const getDate = (value) => {
    if (typeof value === 'number') {
        const d = xlsx.SSF.parse_date_code(value);
        return dayjs(new Date(d.y, d.m - 1, d.d)).format('YYYY-MM-DD');
    }

    const text = getText(value);
    if (text === null) return null;

    const date = dayjs(text, ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'], true);
    return date.isValid() ? date.format('YYYY-MM-DD') : null;
};

module.exports = {
    readExcelFile,
    getText,
    getNumber,
    getDate
};
