// Đọc đúng parser của FE và kiểm tra preview backend; không kết nối/ghi database.
const assert = require('node:assert/strict');
const path = require('node:path');
const { readImportWorkbook } = require('./kiem-tra-file-excel.cjs');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../back-end/package.json'));

(async () => {
    const rows = await readImportWorkbook(path.resolve(__dirname, 'thu-nghiem-mot-sku-nhieu-lo.xlsx'));
    assert.equal(rows.length, 12);
    assert.equal(new Set(rows.map(row => row.sku)).size, 6);
    const categories = [...new Set(rows.map(row => row.category_slug))].map(slug => ({ _id: new (backendRequire('mongoose').Types.ObjectId)(), slug }));
    backendRequire('./src/models/category').find = async () => categories;
    backendRequire('./src/models/product').find = async () => [];
    const preview = await backendRequire('./src/services/inventory.services').previewImport(rows);
    assert.equal(preview.error_rows, 0, JSON.stringify(preview.rows.filter(row => row.errors.length)));
    assert.equal(preview.new_skus, 6);
    assert.equal(rows.reduce((sum, row) => sum + row.quantity * row.unit_cost, 0), 1410000);
    for (const sku of new Set(rows.map(row => row.sku))) {
        const lots = rows.filter(row => row.sku === sku).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
        assert.equal(lots.length, 2);
        assert.deepEqual(lots.map(row => row.list_price), [50000, 60000]);
        const quote = backendRequire('./src/utils/productStock.util').getSaleQuote({ list_price: 50000,
            stocks: lots.map(lot => ({ ...lot, expiry_date: new Date(lot.expiry_date) })) }, 3);
        assert.equal(quote.line_total, 160000);
    }
    console.log('PASS: 12 valid Excel rows, 6 SKUs, 2 lots per SKU, mixed-price total 160000; no database writes.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
