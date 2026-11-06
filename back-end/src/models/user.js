// User chứa tài khoản, vai trò/quyền, thông tin xác minh, sổ địa chỉ, giỏ hàng và danh sách yêu thích.
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Địa chỉ nhúng có _id riêng để chọn/sửa; mã và tên tỉnh/xã được giữ cùng phần thôn/đường chi tiết.
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

    // Chỉ lưu mật khẩu đã băm; select:false khiến truy vấn thông thường không tự trả trường này.
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

    // role xác định nhóm tài khoản; permissions là các nhóm chức năng cấp thêm cho STAFF.
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

    // Mã/thời hạn xác minh email được tách khỏi mã quên mật khẩu để hai luồng không dùng lẫn nhau.
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

// Chỉ số điện thoại dạng chuỗi mới phải duy nhất; nhiều tài khoản được phép chưa có số điện thoại.
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
