const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },

    // Một lần thanh toán có thể gồm các đơn chuẩn bị tại nhiều cơ sở.
    checkout_code: {
        type: String,
        default: null,
        index: true
    },

    checkout_key: {
        type: String,
        default: null
    },

    payment_expires_at: {
        type: Date,
        default: null
    },

    payment_response_code: {
        type: String,
        default: null
    },

    paid_at: {
        type: Date,
        default: null
    },

    note: {
        type: String,
        default: ''
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

    coupon_code: {
        type: String,
        default: null
    },

    coupon_name: {
        type: String,
        default: null
    },

    coupon_discount_amount: {
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
            name: String,
            variant_name: String,
            category_name: String,
            unit: String,
            thumbnail_url: { type: String, default: null },
            list_price: Number,
            quantity: Number,
            price: Number,
            stock_allocations: [{
                _id: false,
                batch_code: String,
                quantity: Number,
                manufactured_date: Date,
                expiry_date: Date
            }]
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
orderSchema.index({ user_id: 1, created_at: -1 });
orderSchema.index({ user_id: 1, checkout_key: 1, branch_id: 1 }, {
    unique: true,
    partialFilterExpression: { checkout_key: { $type: 'string' } }
});

module.exports = mongoose.model('Order', orderSchema);
