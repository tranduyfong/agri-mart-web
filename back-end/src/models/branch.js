const mongoose = require('mongoose');
const { Schema } = mongoose;

const branchSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Branch', branchSchema);
