const mongoose = require('mongoose');
const { Schema } = mongoose;

const supplierSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);
