// Một hội thoại gắn với khách hàng; trạng thái cho biết AI hay nhân viên phụ trách và có đang chờ xử lý không.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatRoomSchema = new Schema({
    conversation_key: { type: String },
    // Trạng thái chờ người thật và hàng đợi/khóa AI giúp tránh phản hồi chen vào sau khi nhân viên tiếp nhận.
    waiting_for_staff: { type: Boolean, default: false },
    handoff_reason: { type: String, enum: ['CUSTOMER_REQUEST', 'ORDER_SUPPORT', 'IMAGE', null], default: null },
    ai_pending: { type: Boolean, default: false },
    ai_locked_until: { type: Date, default: null },
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    assigned_staff_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    status: {
        type: String,
        enum: ['AI_ACTIVE', 'STAFF_ACTIVE', 'CLOSED'],
        default: 'AI_ACTIVE'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

chatRoomSchema.index({ customer_id: 1, updated_at: -1 });
chatRoomSchema.index({ conversation_key: 1 }, { unique: true, partialFilterExpression: { conversation_key: { $type: 'string' } } });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
