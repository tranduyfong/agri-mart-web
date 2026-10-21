const Category = require('../models/category');
const Product = require('../models/product');
const { normalizeSearch } = require('../utils/string.util');

const getCategories = async (keyword, pagination) => {
    // Danh mục nhỏ: chuẩn hóa dấu để hỗ trợ tìm tên tiếng Việt không dấu.
    const candidates = await Category.find({}).sort({ _id: 1 }).lean();
    const matching = candidates.filter((category) => {
        return !keyword || normalizeSearch(category.name).includes(normalizeSearch(keyword));
    });

    const page = matching.slice(pagination.offset, pagination.offset + pagination.pageSize);
    const counts = await Product.aggregate([
        {
            $match: {
                status: 'PUBLISHED',
                category_id: { $in: page.map((category) => category._id) }
            }
        },
        { $group: { _id: '$category_id', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

    return {
        categories: page.map((category) => ({
            id: String(category._id),
            name: category.name,
            slug: category.slug,
            image_url: category.image_url,
            product_count: countMap.get(String(category._id)) || 0
        })),
        totalElements: matching.length
    };
};

module.exports = { getCategories };
