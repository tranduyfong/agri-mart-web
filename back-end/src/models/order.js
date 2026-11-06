// Order giữ thông tin tại thời điểm đặt: sản phẩm, giá, địa chỉ, trạng thái xử lý/thanh toán và các lô đã trừ kho.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    purchase_mode: {
        type: String,
        enum: ['CART', 'BUY_NOW'],
        default: 'CART'
    },
    status_history: [{
        _id: false,
        status: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED']
        },

        changed_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        changed_at: {
            type: Date,
            default: Date.now
        },

        note: {
            type: String,
            default: ''
        }
    }],
    code: {
        type: String,
        required: true,
        unique: true
    },

    // Mã của lần đặt hàng, dùng khi kiểm tra thanh toán.
    checkout_code: {
        type: String,
        default: null,
        index: true
    },

    // Khóa do frontend giữ cho một lựa chọn mua; kết hợp user_id để gửi lại chỉ nhận đơn cũ, không trừ kho lần nữa.
    checkout_key: {
        type: String,
        default: null
    },

    payment_expires_at: {
        type: Date,
        default: null
    },

    confirmed_at: {
        type: Date,
        default: null
    },

    payment_ready_at: {
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


    // Các số tiền được lưu lúc đặt để lịch sử đơn không đổi khi giá sản phẩm/khuyến mãi thay đổi sau này.
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

    // Lưu bản chụp địa chỉ của đơn; sửa sổ địa chỉ trong User không làm đổi thông tin giao của đơn cũ.
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
            // Tổng thực trả có thể gồm nhiều lô khác giá, không lấy giá lô đầu nhân toàn bộ lượng.
            line_total: Number,
            line_subtotal: Number,
            // Ghi lượng lấy từ từng lô và giá vốn khi xuất, phục vụ hoàn kho chính xác và báo cáo lợi nhuận.
            stock_allocations: [{
                _id: false,
                batch_code: String,
                quantity: Number,
                list_price: Number,
                price: Number,
                unit_cost: {
                    type: Number,
                    default: null,
                    min: 0
                },
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
orderSchema.index({ user_id: 1, checkout_key: 1 }, {
    unique: true,
    partialFilterExpression: { checkout_key: { $type: 'string' } }
});

module.exports = mongoose.model('Order', orderSchema);
