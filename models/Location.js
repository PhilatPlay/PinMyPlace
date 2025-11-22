const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    locationId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    // Original GPS coordinates
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    // User-corrected coordinates
    correctedLatitude: {
        type: Number,
        required: true
    },
    correctedLongitude: {
        type: Number,
        required: true
    },
    // Address/description
    address: {
        type: String,
        default: ''
    },
    // QR Code identifier
    qrCode: {
        type: String,
        required: true
    },
    // Metadata
    accuracy: {
        type: Number,
        default: 0
    },
    correctionDistance: {
        type: Number,
        default: 0
    },
    region: {
        type: String,
        default: 'Philippines'
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    // Status
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

// Index for geospatial queries
locationSchema.index({ correctedLatitude: 1, correctedLongitude: 1 });
locationSchema.index({ createdAt: -1 });

// Method to calculate distance from original to corrected
locationSchema.methods.calculateCorrectionDistance = function () {
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

module.exports = mongoose.model('Location', locationSchema);
