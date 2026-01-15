const mongoose = require('mongoose');

// Temporary session to store bulk purchase metadata during payment process
const bulkPurchaseSessionSchema = new mongoose.Schema({
    paymentReferenceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 10
    },
    unitPrice: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    paymentGateway: {
        type: String,
        enum: ['xendit', 'stripe', 'paymongo'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Auto-delete after 1 hour (TTL index)
    }
});

module.exports = mongoose.model('BulkPurchaseSession', bulkPurchaseSessionSchema);
