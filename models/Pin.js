const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
    pinId: {
        type: String,
        required: true
    },
    // Customer info (no account required)
    locationName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        default: ''
    },
    // GPS coordinates
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    correctedLatitude: {
        type: Number,
        required: true
    },
    correctedLongitude: {
        type: Number,
        required: true
    },
    correctionDistance: {
        type: Number,
        default: 0
    },
    // Payment info
    paymentAmount: {
        type: Number,
        default: 100
    },
    paymentMethod: {
        type: String,
        default: 'gcash'
    },
    paymentReferenceId: {
        type: String,
        required: true,
        unique: true // Prevent duplicate payments
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'verified', 'failed'],
        default: 'pending'
    },
    // Agent info (if sold by agent)
    soldByAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        default: null
    },
    agentCommission: {
        type: Number,
        default: 0 // ₱50 if sold by agent
    },
    // QR Code
    qrCode: {
        type: String,
        required: true
    },
    // Expiration
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 90 * 24 * 60 * 60 * 1000) // 90 days
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Usage tracking
    accessCount: {
        type: Number,
        default: 0
    },
    lastAccessed: {
        type: Date
    }
});

// Index for faster queries
pinSchema.index({ pinId: 1 });
pinSchema.index({ customerPhone: 1 });
pinSchema.index({ soldByAgent: 1, createdAt: -1 });
pinSchema.index({ expiresAt: 1 });

// Method to check if pin is expired
pinSchema.methods.isExpired = function () {
    return new Date() > this.expiresAt;
};

// Method to calculate correction distance
pinSchema.methods.calculateCorrectionDistance = function () {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (this.latitude * Math.PI) / 180;
    const φ2 = (this.correctedLatitude * Math.PI) / 180;
    const Δφ = ((this.correctedLatitude - this.latitude) * Math.PI) / 180;
    const Δλ = ((this.correctedLongitude - this.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

module.exports = mongoose.model('Pin', pinSchema);
