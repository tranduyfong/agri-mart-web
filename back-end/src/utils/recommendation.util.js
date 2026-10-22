const { normalizeSearch } = require('./string.util');

const STOP_WORDS = new Set(['va', 'la', 'cua', 'cho', 'voi', 'tu', 'cac', 'nhung', 'duoc', 'tai', 'co', 'san', 'pham', 'nong', 'demo']);

const tokenize = (text = '') => {
    return (normalizeSearch(String(text || '').replace(/<[^>]*>/g, ' ')).match(/[a-z0-9]+/g) || []).filter(
        (word) => word.length > 1 && !STOP_WORDS.has(word)
    );
};

const getProductFeatures = (product) => {
    const features = {};
    const addWords = (words, weight) => {
        for (const word of words) features[word] = (features[word] || 0) + weight;
    };
    addWords(tokenize(product.name), 4);
    addWords(tokenize(product.category_id?.name), 2);
    addWords(tokenize(product.description).slice(0, 100), 0.25);
    if (product.category_id) features['category:' + (product.category_id._id || product.category_id)] = 5;
    for (const unit of new Set((product.variants || []).map((variant) => variant.unit))) {
        if (unit) features['unit:' + normalizeSearch(unit)] = 0.5;
    }
    return features;
};

// TF-IDF: từ xuất hiện ở nhiều sản phẩm sẽ có trọng số thấp hơn.
const buildProductVectors = (products) => {
    const features = products.map(getProductFeatures);
    const documentFrequency = {};
    for (const feature of features) {
        for (const term of Object.keys(feature)) documentFrequency[term] = (documentFrequency[term] || 0) + 1;
    }
    return features.map((feature) => {
        const vector = {};
        for (const term of Object.keys(feature)) {
            const idf = Math.log((products.length + 1) / (documentFrequency[term] + 1)) + 1;
            vector[term] = feature[term] * idf;
        }
        return vector;
    });
};

const cosineSimilarity = (first, second) => {
    let dot = 0;
    let firstLength = 0;
    let secondLength = 0;
    for (const term of Object.keys(first)) {
        dot += first[term] * (second[term] || 0);
        firstLength += first[term] ** 2;
    }
    for (const value of Object.values(second)) secondLength += value ** 2;
    if (!firstLength || !secondLength) return 0;
    return Math.min(1, dot / Math.sqrt(firstLength * secondLength));
};

const recommendProducts = (productId, products, limit = 6) => {
    const currentIndex = products.findIndex((product) => product._id.toString() === productId.toString());
    if (currentIndex === -1) return [];
    const vectors = buildProductVectors(products);
    return products
        .map((product, index) => ({
            id: product._id.toString(),
            score: cosineSimilarity(vectors[currentIndex], vectors[index])
        }))
        .filter((product) => product.id !== productId.toString() && product.score > 0.05)
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, limit);
};

module.exports = {
    tokenize,
    buildProductVectors,
    cosineSimilarity,
    recommendProducts
};
