const test = require('node:test');
const assert = require('node:assert/strict');
const { levenshteinDistance, getSearchScore, getSearchSuggestion } = require('../src/utils/levenshtein.util');
const { tokenize, cosineSimilarity, buildProductVectors, recommendProducts } = require('../src/utils/recommendation.util');

test('Levenshtein tính đúng phép thêm, xóa, thay và chuỗi rỗng', () => {
    assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
    assert.equal(levenshteinDistance('ca', 'caa'), 1);
    assert.equal(levenshteinDistance('caa', 'ca'), 1);
    assert.equal(levenshteinDistance('ca', 'da'), 1);
    assert.equal(levenshteinDistance('', 'abc'), 3);
    assert.equal(levenshteinDistance('abc', ''), 3);
    assert.equal(levenshteinDistance('abc', 'abc'), 0);
});

test('Tìm tiếng Việt không dấu và gõ sai, ưu tiên kết quả khớp', () => {
    const tomato = { name: 'Cà chua hữu cơ', code: 'SP001' };
    assert.equal(getSearchScore('ca chua', tomato), 0);
    assert.ok(getSearchScore('ca chuaa', tomato) > 0);
    assert.equal(getSearchScore('SP001', tomato), 0);
    assert.ok(getSearchScore('dau tayy', { name: 'Dâu tây', code: 'SP002' }) > 0);
    assert.equal(getSearchScore('zzzzzzzz', tomato), null);
    assert.equal(getSearchScore('xz', tomato), null);
    assert.equal(getSearchScore('   ', tomato), null);
    assert.equal(getSearchScore('x'.repeat(121), tomato), null);
});

test('Cosine đúng công thức, an toàn với vector rỗng', () => {
    assert.equal(cosineSimilarity({ a: 3, b: 4 }, { a: 3, b: 4 }), 1);
    assert.equal(cosineSimilarity({ a: 1 }, { b: 1 }), 0);
    assert.equal(cosineSimilarity({}, { b: 1 }), 0);
    assert.equal(cosineSimilarity({}, {}), 0);
    assert.ok(Math.abs(cosineSimilarity({ a: 1, b: 1 }, { a: 1 }) - 1 / Math.sqrt(2)) < 1e-10);
});

test('Gợi ý sửa từ gõ sai có dấu, không gợi ý lại từ đã đúng hoặc không có kết quả', () => {
    const products = [
        { name: 'Cà chua Đà Lạt', code: 'SP001' },
        { name: 'Dâu tây Đà Lạt', code: 'SP002' }
    ];
    assert.equal(getSearchSuggestion('ca chuaa', products), 'Cà chua');
    assert.equal(getSearchSuggestion('dau tayy', products), 'Dâu tây');
    assert.equal(getSearchSuggestion('ca chua', products), null);
    assert.equal(getSearchSuggestion('Cà CHUA', products), null);
    assert.equal(getSearchSuggestion('chua ca', products), null);
    assert.equal(getSearchSuggestion('SP001', products), null);
    assert.equal(getSearchSuggestion('zzzzzzzzz', products), null);
    assert.equal(getSearchSuggestion('ca chuaa', []), null);
    assert.equal(getSearchSuggestion('', products), null);
});

test('TF-IDF và gợi ý nội dung: xếp sản phẩm tương tự trước, loại chính nó', () => {
    const products = [
        {
            _id: '1',
            name: 'Cà chua hữu cơ',
            description: 'Rau củ tươi',
            category_id: { _id: 'veg', name: 'Rau củ' }
        },
        {
            _id: '2',
            name: 'Cà chua bi',
            description: 'Rau củ tươi',
            category_id: { _id: 'veg', name: 'Rau củ' }
        },
        {
            _id: '3',
            name: 'Sữa tươi',
            description: 'Đồ uống',
            category_id: { _id: 'drink', name: 'Đồ uống' }
        },
        {
            _id: '4',
            name: 'Cà chua sấy',
            description: 'Cà chua',
            category_id: { _id: 'dried', name: 'Đồ khô' }
        }
    ];
    assert.deepEqual(tokenize('CÀ CHUA và <b>Đậu</b>'), ['ca', 'chua', 'dau']);
    const vectors = buildProductVectors(products);
    assert.equal(vectors.length, products.length);
    assert.ok(vectors[0].chua > 0);
    const result = recommendProducts('1', products, 2);
    assert.deepEqual(
        result.map((item) => item.id),
        ['2', '4']
    );
    assert.ok(result.every((item) => item.score > 0 && item.score <= 1));
    assert.deepEqual(recommendProducts('missing', products), []);
    assert.deepEqual(recommendProducts('1', [products[0]]), []);
});
