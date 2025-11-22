const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Pin = require('../models/Pin');
const { createGCashPayment, verifyPayment } = require('../services/paymentService');

// Configure multer for payment proofs
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/payment-proofs/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files allowed'));
        }
    }
});

// Generate unique pin ID
function generatePinId() {
    return 'PIN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Generate QR code identifier
function generateQRCode() {
    return 'QR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Initiate payment (creates payment link)
router.post('/initiate-payment', async (req, res) => {
    try {
        const {
            locationName,
            address,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude,
            customerPhone
        } = req.body;

        // Validate required fields
        if (!locationName || !latitude || !longitude ||
            !correctedLatitude || !correctedLongitude || !customerPhone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Generate reference number for tracking
        const referenceNumber = 'PIN-' + Date.now().toString().slice(-8);

        // Create payment link via PayMongo
        const payment = await createGCashPayment(
            50, // ₱50
            `PinMyPlace - GPS Pin for ${locationName}`,
            {
                referenceNumber,
                customerPhone,
                locationName
            }
        );

        if (!payment.success) {
            return res.status(500).json({
                success: false,
                error: payment.error || 'Failed to create payment link'
            });
        }

        res.json({
            success: true,
            paymentLink: payment.paymentLink,
            referenceNumber: payment.referenceNumber,
            pinData: {
                locationName,
                address,
                latitude,
                longitude,
                correctedLatitude,
                correctedLongitude,
                customerPhone
            }
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate payment'
        });
    }
});

// Create pin with payment (no login required)
router.post('/create-with-payment', async (req, res) => {
    try {
        const {
            gcashReference,
            referenceNumber,
            locationName,
            address,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude,
            customerPhone,
            amount,
            agentId // Optional - if sold by agent
        } = req.body;

        // Validate required fields
        if (!gcashReference || !referenceNumber || !locationName || !latitude || !longitude ||
            !correctedLatitude || !correctedLongitude || !customerPhone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Check if GCash reference was already used (prevent duplicate payments)
        const existingPin = await Pin.findOne({ gcashReference: gcashReference });
        if (existingPin) {
            return res.status(400).json({
                success: false,
                error: 'This GCash reference number has already been used. Each payment can only create one pin.'
            });
        }

        // Generate IDs
        const pinId = generatePinId();
        const qrCode = generateQRCode();

        // Create pin record
        const pin = new Pin({
            pinId,
            locationName,
            customerPhone,
            address: address || '',
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            correctedLatitude: parseFloat(correctedLatitude),
            correctedLongitude: parseFloat(correctedLongitude),
            paymentAmount: parseInt(amount) || 50,
            gcashReference: gcashReference,
            referenceNumber,
            paymentStatus: 'pending', // Pending manual verification
            qrCode,
            soldByAgent: agentId || null,
            agentCommission: agentId ? 25 : 0
        });

        // Calculate correction distance
        pin.correctionDistance = pin.calculateCorrectionDistance();

        await pin.save();

        // If sold by agent, update agent stats
        if (agentId) {
            const Agent = require('../models/Agent');
            await Agent.findByIdAndUpdate(agentId, {
                $inc: {
                    totalPinsSold: 1,
                    totalEarnings: 25,
                    pendingCommission: 25
                }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Pin created successfully! Your payment will be verified within 1 hour.',
            pin: {
                pinId: pin.pinId,
                qrCode: pin.qrCode,
                locationName: pin.locationName,
                address: pin.address,
                correctedLatitude: pin.correctedLatitude,
                correctedLongitude: pin.correctedLongitude,
                createdAt: pin.createdAt,
                expiresAt: pin.expiresAt
            }
        });
    } catch (error) {
        console.error('Pin creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create pin'
        });
    }
});

// Get pin by ID (public, no auth needed)
router.get('/:pinId', async (req, res) => {
    try {
        const pin = await Pin.findOne({ pinId: req.params.pinId, isActive: true });

        if (!pin) {
            return res.status(404).json({
                success: false,
                error: 'Pin not found or expired'
            });
        }

        // Check if expired
        if (pin.isExpired()) {
            return res.status(410).json({
                success: false,
                error: 'This pin has expired. Please create a new one for ₱50.'
            });
        }

        // Update access tracking
        pin.accessCount += 1;
        pin.lastAccessed = new Date();
        await pin.save();

        res.json({
            success: true,
            pin: {
                locationName: pin.locationName,
                address: pin.address,
                coordinates: {
                    lat: pin.correctedLatitude,
                    lng: pin.correctedLongitude
                },
                expiresAt: pin.expiresAt,
                accessCount: pin.accessCount
            }
        });
    } catch (error) {
        console.error('Pin lookup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pin'
        });
    }
});

// Renew expired pin
router.post('/renew/:pinId', upload.single('paymentProof'), async (req, res) => {
    try {
        const pin = await Pin.findOne({ pinId: req.params.pinId });

        if (!pin) {
            return res.status(404).json({
                success: false,
                error: 'Pin not found'
            });
        }

        const paymentProof = req.file;
        if (!paymentProof) {
            return res.status(400).json({
                success: false,
                error: 'Payment proof required'
            });
        }

        // Extend expiration by 90 days
        pin.expiresAt = new Date(+new Date() + 90 * 24 * 60 * 60 * 1000);
        pin.isActive = true;
        pin.paymentProof = paymentProof.path;
        pin.paymentStatus = 'verified';

        await pin.save();

        res.json({
            success: true,
            message: 'Pin renewed successfully!',
            pin: {
                pinId: pin.pinId,
                expiresAt: pin.expiresAt
            }
        });
    } catch (error) {
        console.error('Pin renewal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to renew pin'
        });
    }
});

module.exports = router;
