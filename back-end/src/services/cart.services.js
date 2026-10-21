const User = require('../models/user');
const Product = require('../models/product');
const Branch = require('../models/branch');
const { getProductDiscounts } = require('./product.services');
const { availableStock } = require('../utils/productStock.util');

const validateQuantity = (quantity, step) => {
    const units = Math.round(quantity * 1000);
    const stepUnits = Math.round(step * 1000);

    if (!Number.isFinite(quantity) || quantity <= 0 || Math.abs(quantity * 1000 - units) > 0.00001 || units % stepUnits !== 0) {
        throw new Error('INVALID_QUANTITY');
    }
};

const getCart = async (userId) => {
    const user = await User.findById(userId)
        .populate({ path: 'cart_items.product_id', populate: { path: 'category_id', select: 'name' } })
        .populate('cart_items.branch_id', 'name');
    if (!user) throw new Error('USER_NOT_FOUND');

    const productIds = user.cart_items.filter((item) => item.product_id).map((item) => item.product_id._id);
    const discounts = await getProductDiscounts(productIds);
    const items = [];

    for (const item of user.cart_items) {
        const product = item.product_id;
        const branch = item.branch_id;
        const variant = product?.variants.id(item.variant_id);
        if (!product || !branch || !variant) continue;

        items.push({
            id: item._id.toString(),
            quantity: item.quantity,
            variant_id: variant._id.toString(),
            variant_name: variant.name,
            sku: variant.sku,
            unit: variant.unit,
            step_quantity: variant.step_quantity,
            list_price: variant.list_price,
            product_id: product._id.toString(),
            name: product.name,
            slug: product.slug,
            status: product.status,
            category_name: product.category_id?.name || null,
            branch_id: branch._id.toString(),
            branch_name: branch.name,
            stock_quantity: availableStock(variant, branch._id),
            thumbnail_url: product.images[0] || null,
            discount_percent: discounts[product._id.toString()] ?? null
        });
    }

    return items.reverse();
};

const addCartItem = async (userId, variantId, quantity) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const product = await Product.findOne({ 'variants._id': variantId, status: 'PUBLISHED' });
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    const variant = product.variants.id(variantId);
    validateQuantity(quantity, variant.step_quantity);

    const branches = await Branch.find({ _id: { $in: variant.stocks.map((stock) => stock.branch_id) } });
    const choices = [];

    for (const branch of branches) {
        const item = user.cart_items.find((entry) => entry.variant_id.equals(variantId) && entry.branch_id.equals(branch._id));
        const inCart = item?.quantity || 0;
        const stock = availableStock(variant, branch._id);

        if (Math.round((inCart + quantity) * 1000) / 1000 <= stock) {
            choices.push({ branch, item, inCart, stock });
        }
    }

    choices.sort((a, b) => b.inCart - a.inCart || b.stock - a.stock);
    if (!choices.length) throw new Error('INSUFFICIENT_STOCK');

    const choice = choices[0];
    if (choice.item) {
        choice.item.quantity = Math.round((choice.item.quantity + quantity) * 1000) / 1000;
    } else {
        user.cart_items.push({
            product_id: product._id,
            variant_id: variant._id,
            branch_id: choice.branch._id,
            quantity
        });
    }

    await user.save();
};

const updateCartItem = async (userId, itemId, quantity) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const item = user.cart_items.id(itemId);
    if (!item) throw new Error('CART_ITEM_NOT_FOUND');

    const product = await Product.findOne({ _id: item.product_id, status: 'PUBLISHED' });
    const variant = product?.variants.id(item.variant_id);
    if (!variant) throw new Error('PRODUCT_NOT_FOUND');

    validateQuantity(quantity, variant.step_quantity);
    if (quantity > availableStock(variant, item.branch_id)) throw new Error('INSUFFICIENT_STOCK');

    item.quantity = quantity;
    await user.save();
};

const removeCartItem = async (userId, itemId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const item = user.cart_items.id(itemId);
    if (!item) throw new Error('CART_ITEM_NOT_FOUND');

    item.deleteOne();
    await user.save();
};

module.exports = { getCart, addCartItem, updateCartItem, removeCartItem };
