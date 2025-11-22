const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
    agentId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    // Agent status
    isActive: {
        type: Boolean,
        default: true
    },
    subscriptionStatus: {
        type: String,
        enum: ['trial', 'active', 'expired'],
        default: 'trial'
    },
    subscriptionAmount: {
        type: Number,
        default: 300 // ₱300/month
    },
    subscriptionExpiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
    },
    // Earnings tracking
    totalPinsSold: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },
    pendingCommission: {
        type: Number,
        default: 0
    },
    paidCommission: {
        type: Number,
        default: 0
    },
    // Bank/GCash info for payouts
    payoutMethod: {
        type: String,
        enum: ['gcash', 'bank', 'cash'],
        default: 'gcash'
    },
    payoutDetails: {
        type: String // GCash number or bank account
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLoginAt: {
        type: Date
    }
});

// Hash password before saving
agentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password
agentSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON
agentSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

// Check if subscription is active
agentSchema.methods.hasActiveSubscription = function () {
    return this.subscriptionStatus === 'active' ||
        (this.subscriptionStatus === 'trial' && new Date() < this.subscriptionExpiresAt);
};

module.exports = mongoose.model('Agent', agentSchema);
