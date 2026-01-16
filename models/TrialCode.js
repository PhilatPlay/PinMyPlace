const mongoose = require('mongoose');

const trialCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    trialName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    // Usage limits
    maxUses: {
        type: Number,
        default: null // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    // Time limits
    expiresAt: {
        type: Date,
        default: null // null = no expiration
    },
    // Status
    active: {
        type: Boolean,
        default: true
    },
    // Tracking
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsedAt: {
        type: Date,
        default: null
    }
});

// Index for faster lookups
trialCodeSchema.index({ code: 1 });
trialCodeSchema.index({ active: 1 });

// Method to check if code is valid
trialCodeSchema.methods.isValid = function() {
    // Check if active
    if (!this.active) {
        return { valid: false, reason: 'Trial code is no longer active' };
    }
    
    // Check expiration
    if (this.expiresAt && new Date() > this.expiresAt) {
        return { valid: false, reason: 'Trial code has expired' };
    }
    
    // Check usage limit
    if (this.maxUses && this.usedCount >= this.maxUses) {
        return { valid: false, reason: 'Trial code usage limit reached' };
    }
    
    return { valid: true };
};

// Method to increment usage
trialCodeSchema.methods.incrementUsage = async function() {
    this.usedCount += 1;
    this.lastUsedAt = new Date();
    await this.save();
};

module.exports = mongoose.model('TrialCode', trialCodeSchema);
