// Lưu yêu cầu thêm/sửa/nhập hàng của nhân viên để quản trị viên duyệt trước khi áp dụng vào dữ liệu thật.
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Lưu riêng đề nghị để sản phẩm đang bán chưa bị thay đổi khi nhân viên gửi duyệt.
const productChangeSchema = new Schema({
    type: {
        type: String,
        enum: ['CREATE', 'UPDATE', 'IMPORT'],
        required: true
    },
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    title: {
        type: String,
        required: true
    },
    requested_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    // Payload đã được lọc theo từng thao tác; dịch vụ sản phẩm kiểm tra lại khi duyệt.
    data: {
        type: Schema.Types.Mixed,
        required: true
    },
    // Bản trước/sau phục vụ đối chiếu khi duyệt; data là payload sẽ áp dụng, không phải Product đã được ghi thật.
    before: {
        type: Schema.Types.Mixed,
        default: null
    },
    after: {
        type: Schema.Types.Mixed,
        default: null
    },
    request_key: {
        type: String,
        default: null
    },
    reviewed_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewed_at: {
        type: Date,
        default: null
    },
    review_note: {
        type: String,
        default: ''
    },
    result: {
        type: Schema.Types.Mixed,
        default: null
    }
}, {
    optimisticConcurrency: true,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

productChangeSchema.index({ status: 1, created_at: -1 });
productChangeSchema.index({ requested_by: 1, created_at: -1 });
// Một sản phẩm chỉ có một yêu cầu UPDATE đang chờ để tránh hai bản sửa cạnh tranh nhau.
productChangeSchema.index({ product_id: 1 }, {
    unique: true,
    partialFilterExpression: { type: 'UPDATE', status: 'PENDING' }
});
productChangeSchema.index({ requested_by: 1, request_key: 1 }, {
    unique: true,
    partialFilterExpression: { request_key: { $type: 'string' } }
});

module.exports = mongoose.model('ProductChange', productChangeSchema);
