// Product chứa thông tin chung; mỗi variant là một quy cách bán và có nhiều lô tồn kho khác hạn sử dụng.
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Một dòng stocks là một lô: cùng sản phẩm/SKU vẫn có thể có các lô khác hạn dùng.
const stockSubSchema = new Schema({
    // Mỗi lô có giá bán riêng. Lô cũ chưa có trường này dùng giá mặc định của SKU.
    list_price: {
        type: Number,
        default: null,
        min: 0,
        validate: { validator: (value) => value == null || Number.isSafeInteger(value), message: 'Giá bán phải là số nguyên' }
    },
    batch_code: {
        type: String,
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },

    manufactured_date: {
        type: Date,
        default: null
    },

    expiry_date: {
        type: Date,
        required: true
    }
}, { _id: false });

// Quy cách/SKU có đơn vị, bước lượng và giá niêm yết riêng; ví dụ bán theo 0.5 kg hoặc nguyên một khay.
const variantSubSchema = new Schema({
    sku: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    unit: {
        type: String,
        required: true,
        default: 'kg'
    },

    step_quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 0.001
    },

    list_price: {
        type: Number,
        required: true,
        min: 0
    },

    stocks: [stockSubSchema]
}, { id: false });

const productSchema = new Schema({
    category_id: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    code: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    slug: {
        type: String,
        required: true,
        unique: true
    },

    description: {
        type: String,
        default: ''
    },

    status: {
        type: String,
        enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
        default: 'DRAFT'
    },

    images: [{ type: String }],

    variants: [variantSubSchema]
}, {
    optimisticConcurrency: true,
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// SKU cần duy nhất giữa các sản phẩm; validator phía dưới còn chặn trùng SKU trong cùng một mảng variants.
productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });

productSchema.index({ category_id: 1, status: 1, created_at: -1 });

productSchema.path('variants').validate((variants) => {
    const skus = variants.map((variant) => variant.sku);
    return new Set(skus).size === skus.length;
}, 'SKU trong sản phẩm không được trùng');

module.exports = mongoose.model('Product', productSchema);
