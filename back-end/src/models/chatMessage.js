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

    attachments: [{ type: String }]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false
    }
});

chatMessageSchema.index({ room_id: 1, created_at: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
