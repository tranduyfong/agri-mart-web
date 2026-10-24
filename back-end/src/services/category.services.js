const Category = require('../models/category');
const Product = require('../models/product');
const mongoose = require('mongoose');
const slugify = require('slugify');
const { normalizeSearch } = require('../utils/string.util');
const { getImageUrl } = require('../utils/file.util');

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

const saveCategory = async (id, data, files = []) => {
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 150) throw new Error('INVALID_DATA');
    const slug = data.slug || slugify(data.name, { lower: true, strict: true, locale: 'vi' });
    if (typeof slug !== 'string' || !/^[a-z0-9-]{1,180}$/.test(slug)) throw new Error('INVALID_DATA');
    let category;
    if (id) {
        if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
        category = await Category.findById(id);
        if (!category) throw new Error('RESOURCE_NOT_FOUND');
        category.name = data.name.trim();
        category.slug = slug;
        category.image_url = getImageUrl(data, files, category.image_url);
        await category.save();
    } else category = await Category.create({ name: data.name.trim(), slug, image_url: getImageUrl(data, files) });
    return { id: category._id.toString(), name: category.name, slug: category.slug, image_url: category.image_url };
};

module.exports = { getCategories, saveCategory };
