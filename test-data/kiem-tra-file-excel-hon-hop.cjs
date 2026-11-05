// Kiểm tra file hỗn hợp với parser thật và quy tắc preview; không ghi vào database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { readImportWorkbook } = require('./kiem-tra-file-excel.cjs');
const backendRequire = createRequire(path.resolve(__dirname, '../back-end/package.json'));

(async () => {
    const workbook = path.resolve(process.argv[2] || path.join(__dirname, 'nhap-hang-50-dong-hon-hop.xlsx'));
    const expected = JSON.parse(fs.readFileSync(workbook.replace(/\.xlsx$/, '.expected.json'), 'utf8'));
    const originalPath = path.join(path.dirname(workbook), expected.source_file);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(originalPath)).digest('hex'), expected.source_sha256);
    const original = await readImportWorkbook(originalPath);
    const rows = await readImportWorkbook(workbook);
    assert.equal(rows.length, 50);
    assert.deepEqual(rows.slice(0, 10), original.slice(0, 10));
    const oldSkus = new Set(original.map((row) => row.sku));
    const oldNames = new Set(original.map((row) => row.name));
    assert.ok(rows.slice(10, 40).every((row) => !oldSkus.has(row.sku) && !oldNames.has(row.name)));
    assert.equal(new Set(rows.slice(10, 40).map((row) => row.sku)).size, 30);
    const response = await fetch('http://127.0.0.1:8000/api/category?pageNumber=0&pageSize=100', { signal: AbortSignal.timeout(5000) });
    assert.ok(response.ok);
    const categories = (await response.json()).data.map((category) => ({ ...category, _id: category.id }));
    const Product = backendRequire('./src/models/product');
    backendRequire('./src/models/category').find = async () => categories;
    // Mô phỏng file trước đã được duyệt, với đúng SKU/lô/ngày của 50 dòng gốc.
    const products = original.map((row) => Product.hydrate({
        code: row.code, name: row.name,
        category_id: categories.find((category) => category.slug === row.category_slug)._id,
        variants: [{ sku: row.sku, name: row.variant_name, unit: row.unit,
            step_quantity: row.step_quantity, list_price: row.list_price,
            stocks: [{ batch_code: row.batch_code, quantity: row.quantity,
                manufactured_date: new Date(row.manufactured_date), expiry_date: new Date(row.expiry_date) }] }],
    }));
    Product.find = async () => products;
    const previewImport = backendRequire('./src/services/inventory.services').previewImport;
    const result = await previewImport(rows);
    assert.equal(result.total_rows, 50);
    assert.equal(result.valid_rows, 40);
    assert.equal(result.error_rows, 10);
    assert.ok(result.rows.slice(0, 10).every((row) => !row.is_new && !row.errors.length));
    assert.ok(result.rows.slice(10, 40).every((row) => row.is_new && !row.errors.length));
    for (const expectedError of expected.errors) {
        const checked = result.rows.find((row) => row.row_number === expectedError.row_number);
        assert.deepEqual(checked.errors, [expectedError.message], 'Sai lỗi tại dòng ' + expectedError.row_number);
    }
    // Nếu chưa nhập file gốc, 10 dòng cũ sẽ được coi là SKU mới; tổng lỗi vẫn là 10.
    Product.find = async () => [];
    const noOriginal = await previewImport(rows);
    assert.equal(noOriginal.valid_rows, 40);
    assert.equal(noOriginal.error_rows, 10);
    console.log(JSON.stringify({ file: path.basename(workbook), rows: 50, exactRowsFromPreviousFile: 10,
        validNewRows: 30, intendedErrorRows: 10, validRows: result.valid_rows,
        frontendParser: 'passed', backendRulesWithLiveCategoriesAndSimulatedPreviousImport: 'passed', databaseWrites: 0 }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
