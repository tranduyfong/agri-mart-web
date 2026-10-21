const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true
    },

    slug: {
        type: String,
        required: true,
        unique: true
    },

    image_url: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
