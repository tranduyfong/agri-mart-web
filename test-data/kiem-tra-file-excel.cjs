// Đọc bằng parser giao diện; chạy quy tắc preview với danh mục từ API, không nhập kho.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const staffRequire = createRequire(path.join(root, 'staff-front-end/package.json'));
const backendRequire = createRequire(path.join(root, 'back-end/package.json'));
const ts = staffRequire('typescript');
const readXlsxFile = staffRequire('read-excel-file/node');
const source = fs.readFileSync(path.join(root, 'staff-front-end/src/utils/importFile.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
const parserModule = { exports: {} };
const parserRequire = (name) => name === 'read-excel-file'
    ? async (file) => readXlsxFile(Buffer.from(await file.arrayBuffer()))
    : staffRequire(name);
new Function('require', 'exports', 'module', compiled.outputText)(parserRequire, parserModule.exports, parserModule);
const readImportWorkbook = (workbook) => parserModule.exports.readImportFile(new File([fs.readFileSync(workbook)], path.basename(workbook)));
module.exports = { readImportWorkbook };

const validate = async () => {
    const workbook = path.resolve(process.argv[2] || path.join(__dirname, 'nhap-hang-50-san-pham.xlsx'));
    const rows = await readImportWorkbook(workbook);
    assert.equal(rows.length, 50);
    assert.equal(new Set(rows.map((row) => row.code)).size, 50);
    assert.equal(new Set(rows.map((row) => row.sku)).size, 50);
    for (const row of rows) {
        assert.ok(Number.isInteger(row.list_price) && row.list_price > row.unit_cost && row.unit_cost > 0);
        assert.ok(row.quantity > 0 && Math.round(row.quantity * 1000) % Math.round(row.step_quantity * 1000) === 0);
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(row.expiry_date));
    }
    const response = await fetch('http://127.0.0.1:8000/api/category?pageNumber=0&pageSize=100', { signal: AbortSignal.timeout(5000) });
    assert.ok(response.ok);
    const categories = (await response.json()).data.map((category) => ({ ...category, _id: category.id }));
    // Thay truy vấn trong riêng tiến trình kiểm tra: 50 SKU mới, danh mục thực tế từ API.
    // Không gọi endpoint xác nhận nhập, không kết nối hay thay đổi database.
    backendRequire('./src/models/category').find = async () => categories;
    backendRequire('./src/models/product').find = async () => [];
    const result = await backendRequire('./src/services/inventory.services').previewImport(rows);
    assert.equal(result.error_rows, 0, JSON.stringify(result.rows.filter((row) => row.errors.length)));
    assert.equal(result.valid_rows, 50);
    assert.equal(result.new_skus, 50);
    console.log(JSON.stringify({ file: path.basename(workbook), rows: rows.length, validRows: result.valid_rows,
        errors: result.error_rows, newSkus: result.new_skus, frontendParser: 'passed',
        backendRulesWithLiveCategories: 'passed', databaseWrites: 0 }));
};
if (require.main === module) validate().catch((error) => { console.error(error.message); process.exitCode = 1; });
