const User = require('../models/user');
const Product = require('../models/product');
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
    const user = await User.findById(userId).populate({ path: 'cart_items.product_id', populate: { path: 'category_id', select: 'name' } });
    if (!user) throw new Error('USER_NOT_FOUND');

    const productIds = user.cart_items.filter((item) => item.product_id).map((item) => item.product_id._id);
    const discounts = await getProductDiscounts(productIds);
    const items = [];

    for (const item of user.cart_items) {
        const product = item.product_id;
        const variant = product?.variants.id(item.variant_id);
        if (!product || !variant) continue;

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
            stock_quantity: availableStock(variant),
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

    const item = user.cart_items.find((entry) => entry.variant_id.equals(variantId));
    const total = Math.round(((item?.quantity || 0) + quantity) * 1000) / 1000;
    if (total > availableStock(variant)) throw new Error('INSUFFICIENT_STOCK');

    if (item) {
        item.quantity = total;
    } else {
        user.cart_items.push({
            product_id: product._id,
            variant_id: variant._id,
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
    if (quantity > availableStock(variant)) throw new Error('INSUFFICIENT_STOCK');

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
