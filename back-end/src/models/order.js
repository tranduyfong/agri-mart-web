const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },

    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    branch_id: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },

    total_amount: Number,

    shipping_fee: {
        type: Number,
        default: 0
    },

    discount_amount: {
        type: Number,
        default: 0
    },

    final_amount: Number,

    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING'
    },

    payment_method: {
        type: String,
        enum: ['COD', 'VNPAY', 'MOMO']
    },

    payment_status: {
        type: String,
        enum: ['UNPAID', 'PAID', 'REFUNDED'],
        default: 'UNPAID'
    },

    transaction_code: {
        type: String,
        default: null
    },

    shipping_address: {
        type: Schema.Types.Mixed,
        required: true
    },

    items: [
        {
            product_id: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },

            variant_id: {
                type: Schema.Types.ObjectId,
                required: true
            },

            variant_sku: String,
            quantity: Number,
            price: Number
        }
    ],

    promotions: [
        {
            promotion_id: {
                type: Schema.Types.ObjectId,
                ref: 'Promotion'
            },

            discount_amount: Number
        }
    ]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

orderSchema.index({ 'items.product_id': 1, status: 1, created_at: -1 });

module.exports = mongoose.model('Order', orderSchema);
