const mongoose = require('mongoose');
const { Schema } = mongoose;

const bannerSchema = new Schema({
    type: {
        type: String,
        enum: ['POPUP', 'HOME_CAROUSEL'],
        default: 'HOME_CAROUSEL'
    },

    title: {
        type: String,
        required: true
    },

    image_url: {
        type: String,
        required: true
    },

    link_url: {
        type: String,
        default: null
    },

    is_active: {
        type: Boolean,
        default: true
    },

    starts_at: {
        type: Date,
        default: null
    },

    ends_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Banner', bannerSchema);
