const mongoose = require('mongoose');
const { Schema } = mongoose;

const promotionSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    discount_value: {
        type: Number,
        required: true,
        min: 0
    },

    discount_type: {
        type: String,
        enum: ['PERCENT', 'AMOUNT'],
        required: true
    },

    promotion_scope: {
        type: String,
        enum: ['PRODUCT', 'SHIPPING'],
        default: 'PRODUCT'
    },

    is_flash_sale: {
        type: Boolean,
        default: false
    },

    requires_code: {
        type: Boolean,
        default: false
    },

    min_order_value: {
        type: Number,
        default: 0
    },

    valid_from: {
        type: Date,
        required: true
    },

    valid_to: {
        type: Date,
        required: true
    },

    product_ids: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }
    ]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

promotionSchema.index({ product_ids: 1, valid_from: 1, valid_to: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
