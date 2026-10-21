const mongoose = require('mongoose');
const { Schema } = mongoose;

const goodsReceiptSchema = new Schema({
    branch_id: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },

    supplier_id: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        default: null
    },

    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    total_amount: {
        type: Number,
        required: true,
        default: 0
    },

    note: {
        type: String,
        default: ''
    },

    items: [
        {
            product_id: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },

            variant_sku: {
                type: String,
                required: true
            },

            batch_code: {
                type: String,
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 0.001
            },

            unit_cost: {
                type: Number,
                required: true,
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
        }
    ]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false
    }
});

goodsReceiptSchema.index({ branch_id: 1, created_at: -1 });

module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema);
