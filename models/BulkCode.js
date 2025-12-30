const mongoose = require('mongoose');

const bulkCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    // Purchase details
    purchaseEmail: {
        type: String,
        required: true
    },
    purchasePhone: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 10 // Minimum bulk purchase is 10
    },
    unitPrice: {
        type: Number,
        required: true // Price per code (₱50 or ₱75 depending on quantity)
    },
    totalPaid: {
        type: Number,
        required: true
    },
    paymentReferenceId: {
        type: String,
        required: true,
        unique: true
    },
    // Usage tracking
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date,
        default: null
    },
    usedByPhone: {
        type: String,
        default: null
    },
    redeemedPinId: {
        type: String,
        default: null
    },
    // Expiration
    purchasedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

// Index for fast lookup
bulkCodeSchema.index({ code: 1 });
bulkCodeSchema.index({ isUsed: 1, expiresAt: 1 });

// Method to check if code is valid
bulkCodeSchema.methods.isValid = function() {
    return !this.isUsed && new Date() < this.expiresAt;
};

// Static method to generate unique codes
bulkCodeSchema.statics.generateCode = function() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let code = 'DL-'; // dropLogik prefix
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

module.exports = mongoose.model('BulkCode', bulkCodeSchema);
