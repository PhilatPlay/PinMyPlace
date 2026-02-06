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
        enum: ['pending', 'verified', 'failed', 'code_redeemed'],
        default: 'pending'
    },
    // Bulk code redemption (alternative to payment)
    redeemedCode: {
        type: String,
        default: null,
        uppercase: true
    },
    redemptionMethod: {
        type: String,
        enum: ['payment', 'bulk_code'],
        default: 'payment'
    },
    // QR Code
    qrCode: {
        type: String,
        required: true
    },
    googleMapsUrl: {
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
        default: null // Pins never expire
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
    },
    // Drone delivery fields (optional)
    droneEnabled: {
        type: Boolean,
        default: false
    },
    droneData: {
        landingZoneType: {
            type: String,
            enum: ['roof', 'yard', 'balcony', 'street', 'field', 'other'],
            default: null
        },
        dropZoneDimensions: {
            width: { type: Number, default: null }, // meters
            length: { type: Number, default: null } // meters
        },
        elevation: {
            type: Number,
            default: null // meters above sea level (auto-fetched or user-provided)
        },
        heightAboveGround: {
            type: Number,
            default: null // meters above ground level (e.g., floor height)
        },
        floorNumber: {
            type: String,
            default: null // e.g., "3rd floor", "rooftop"
        },
        obstacles: {
            type: String,
            default: null // e.g., "trees on west side, power lines 5m north"
        },
        accessRestrictions: {
            type: String,
            default: null // e.g., "private property - permission granted"
        },
        approachDirection: {
            type: String,
            default: null // e.g., "from south", "avoid west side"
        },
        notes: {
            type: String,
            default: null // additional drone delivery instructions
        }
    }
});

// Index for faster queries
pinSchema.index({ pinId: 1 });
pinSchema.index({ customerPhone: 1 });
pinSchema.index({ redeemedCode: 1 });
pinSchema.index({ expiresAt: 1 });

// Method to check if pin is expired
pinSchema.methods.isExpired = function () {
    return false; // Pins never expire
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
