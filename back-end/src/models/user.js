const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSubSchema = new Schema({
    recipient_name: {
        type: String,
        required: true,
        maxlength: 150
    },

    phone: {
        type: String,
        required: true,
        maxlength: 30
    },

    province_code: {
        type: Number,
        default: null
    },

    province_name: {
        type: String,
        default: null
    },

    ward_code: {
        type: Number,
        default: null
    },

    ward_name: {
        type: String,
        default: null
    },

    hamlet: {
        type: String,
        trim: true,
        maxlength: 150,
        default: ''
    },

    street_address: {
        type: String,
        maxlength: 300,
        default: ''
    },

    address_line: {
        type: String,
        required: true,
        maxlength: 700
    },

    is_default: {
        type: Boolean,
        default: false
    }
}, { id: false });

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password_hash: {
        type: String,
        required: true,
        select: false
    },

    full_name: {
        type: String,
        required: true,
        maxlength: 150
    },

    phone: {
        type: String,
        default: null
    },

    avatar_url: {
        type: String,
        default: null
    },

    role: {
        type: String,
        enum: ['ADMIN', 'STAFF', 'CUSTOMER'],
        default: 'CUSTOMER'
    },

    permissions: [{ type: String }],

    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'LOCKED'],
        default: 'PENDING'
    },

    email_verify_token: {
        type: String,
        default: null,
        select: false
    },

    email_verify_expires: {
        type: Date,
        default: null,
        select: false
    },

    email_verified_at: {
        type: Date,
        default: null
    },

    password_reset_token: {
        type: String,
        default: null,
        select: false
    },

    password_reset_expires: {
        type: Date,
        default: null,
        select: false
    },

    addresses: [addressSubSchema],

    assigned_branches: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Branch'
        }
    ],

    // Giữ các tính năng giỏ hàng và yêu thích hiện có cùng tài khoản.
    cart_items: [
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

            branch_id: {
                type: Schema.Types.ObjectId,
                ref: 'Branch',
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 0.001
            }
        }
    ],

    wishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],

    // Các trường phục vụ thu hồi phiên và giới hạn số lần nhập OTP.
    token_version: {
        type: Number,
        default: 0,
        select: false
    },

    email_verify_attempts: {
        type: Number,
        default: 0,
        select: false
    },

    password_reset_attempts: {
        type: Number,
        default: 0,
        select: false
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    optimisticConcurrency: true
});

userSchema.index(
    { phone: 1 },
    {
        unique: true,
        partialFilterExpression: {
            phone: { $type: 'string' }
        }
    }
);

module.exports = mongoose.model('User', userSchema);
