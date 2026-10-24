const mongoose = require('mongoose');
const { Schema } = mongoose;

const recipientSubSchema = new Schema({
    email: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['PENDING', 'SENT', 'FAILED', 'SKIPPED'],
        default: 'PENDING'
    },

    error: {
        type: String,
        default: ''
    }
}, { _id: false });

const newsletterSchema = new Schema({
    subject: {
        type: String,
        required: true,
        maxlength: 200
    },

    content: {
        type: String,
        required: true,
        maxlength: 30000
    },

    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    status: {
        type: String,
        enum: ['DRAFT', 'SENDING', 'SENT', 'PARTIAL'],
        default: 'DRAFT'
    },

    sent_at: {
        type: Date,
        default: null
    },

    recipients: [recipientSubSchema]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

newsletterSchema.index({ created_at: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
