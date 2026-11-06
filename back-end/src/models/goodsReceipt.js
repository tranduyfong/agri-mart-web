// Phiếu nhập là chứng từ ghi số lượng, giá nhập và hạn dùng của từng lô; dùng để đối chiếu kho và tính giá vốn.
const mongoose = require('mongoose');
const { Schema } = mongoose;

const goodsReceiptSchema = new Schema({
    // Khóa chống nhập lặp cho cùng người tạo; source_file giữ tên file để tra lại chứng từ.
    import_key: {
        type: String,
        default: null
    },

    source_file: {
        type: String,
        default: ''
    },

    supplier_id: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        default: null
    },

    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    total_amount: {
        type: Number,
        required: true,
        default: 0
    },

    note: {
        type: String,
        default: ''
    },

    // Mỗi dòng lưu SKU/lô, lượng và giá nhập; tên/đơn vị được chụp lại để lịch sử vẫn đọc được.
    items: [
        {
            product_id: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },

            variant_sku: {
                type: String,
                required: true
            },

            name: {
                type: String,
                default: ''
            },

            unit: {
                type: String,
                default: ''
            },

            batch_code: {
                type: String,
                required: true
            },

            quantity: {
                type: Number,
                required: true,
                min: 0.001
            },

            unit_cost: {
                type: Number,
                required: true,
                min: 0
            },

            manufactured_date: {
                type: Date,
                default: null
            },

            expiry_date: {
                type: Date,
                required: true
            }
        }
    ]
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: false
    }
});

goodsReceiptSchema.index({ created_at: -1 });
goodsReceiptSchema.index({ supplier_id: 1, created_at: -1 });
goodsReceiptSchema.index({ created_by: 1, import_key: 1 }, {
    unique: true,
    partialFilterExpression: { import_key: { $type: 'string' } }
});

module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema);
