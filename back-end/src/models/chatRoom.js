const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatRoomSchema = new Schema({
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    branch_id: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
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

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
