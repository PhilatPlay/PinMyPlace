const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'PHP'
    },
    paymentMethod: {
        type: String,
        enum: ['pending', 'gcash', 'paymaya', 'card', 'bank_transfer'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['pending', 'verification_pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentProof: {
        type: String, // File path to uploaded proof
        default: null
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    submittedAt: {
        type: Date
    },
    verifiedAt: {
        type: Date
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Additional metadata
    transactionId: {
        type: String // From payment gateway if using API
    },
    notes: {
        type: String
    }
});

// Index for faster queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
