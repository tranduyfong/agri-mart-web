const { normalizeSearch } = require('./string.util');

// Mỗi lần thêm, xóa hoặc thay một ký tự có chi phí bằng 1.
const levenshteinDistance = (first, second) => {
    if (first.length > second.length) return levenshteinDistance(second, first);
    let previous = Array.from({ length: first.length + 1 }, (_, index) => index);

    for (let row = 1; row <= second.length; row++) {
        const current = [row];
        for (let column = 1; column <= first.length; column++) {
            const cost = first[column - 1] === second[row - 1] ? 0 : 1;
            current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
        }
        previous = current;
    }
    return previous[first.length];
};

const getWords = (text) => normalizeSearch(text).match(/[a-z0-9]+/g) || [];

// Điểm thấp đứng trước. null nghĩa là không đủ gần để xuất hiện trong kết quả.
const getSearchScore = (keyword, product) => {
    const queryWords = getWords(keyword);
    if (!queryWords.length || keyword.length > 120) return null;
    const query = queryWords.join(' ');
    const name = getWords(product.name).join(' ');
    const code = getWords(product.code).join(' ');
    if (name.includes(query) || code.includes(query)) return 0;

    const words = getWords(product.name + ' ' + product.code);
    let totalDistance = 0;
    for (const word of queryWords) {
        // Từ 1–2 ký tự phải đúng; từ ngắn cho sai 1 ký tự, từ dài cho sai 2.
        const allowed = word.length < 3 ? 0 : word.length < 6 ? 1 : 2;
        let best = Infinity;
        for (const candidate of words) {
            if (candidate.startsWith(word)) best = 0;
            else if (Math.abs(word.length - candidate.length) <= allowed) {
                best = Math.min(best, levenshteinDistance(word, candidate));
            }
        }
        if (best > allowed) return null;
        totalDistance += best;
    }
    return 1 + totalDistance / query.length;
};

// Lấy từ đúng có dấu từ sản phẩm khớp nhất, chỉ gợi ý khi thực sự sửa lỗi gõ.
const getSearchSuggestion = (keyword, products) => {
    if (!keyword) return null;
    let closestProduct = null;
    let closestScore = Infinity;
    for (const product of products) {
        const score = getSearchScore(keyword, product);
        if (score === 0 || score === 1) return null;
        if (score !== null && score < closestScore) {
            closestScore = score;
            closestProduct = product;
        }
    }
    if (!closestProduct) return null;

    const words = (closestProduct.name + ' ' + closestProduct.code).match(/[\p{L}\p{N}]+/gu) || [];
    const correctedWords = getWords(keyword).map((word) => {
        let closestWord = word;
        let distance = Infinity;
        for (const candidate of words) {
            const normalized = normalizeSearch(candidate);
            const current = normalized.startsWith(word) ? 0 : levenshteinDistance(word, normalized);
            if (current < distance) {
                distance = current;
                closestWord = candidate;
            }
        }
        return closestWord;
    });
    return correctedWords.join(' ');
};

module.exports = { levenshteinDistance, getSearchScore, getSearchSuggestion };
