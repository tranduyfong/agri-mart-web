// Mỗi document là một tin nhắn; lưu người gửi, ảnh, gợi ý AI và những tài khoản đã đọc tin.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatMessageSchema = new Schema({
    room_id: {
        type: Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true
    },

    sender_type: {
        type: String,
        enum: ['CUSTOMER', 'STAFF', 'AI'],
        required: true
    },

    sender_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    content: {
        type: String,
        default: ''
    },

    attachments: [{ type: String }],
    // Liên kết tin AI với câu hỏi gốc; index duy nhất phía dưới ngăn AI trả lời cùng tin hai lần.
    reply_to: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    recommendations: [{
        _id: false,
        product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        variant_id: { type: Schema.Types.ObjectId, required: true },
        quantity: { type: Number, required: true },
        name: String,
        variant_name: String,
        unit: String,
        thumbnail_url: { type: String, default: null }
    }],
    client_id: { type: String },
    // Mỗi tài khoản có trạng thái đọc riêng; một nhân viên đọc không tự xóa số chưa đọc của nhân viên khác.
    read_by: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false
    }
});

chatMessageSchema.index({ room_id: 1, created_at: -1 });
chatMessageSchema.index({ room_id: 1, _id: -1 });
chatMessageSchema.index({ sender_id: 1, client_id: 1 }, { unique: true, partialFilterExpression: { client_id: { $type: 'string' } } });
chatMessageSchema.index({ reply_to: 1 }, { unique: true, partialFilterExpression: { sender_type: 'AI', reply_to: { $type: 'objectId' } } });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
