const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Pin = require('../models/Pin');
const { createGCashPayment, verifyPayment, handleWebhook } = require('../services/paymentService');

// PayMongo Webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const event = JSON.parse(req.body.toString());

        console.log('PayMongo webhook received:', event.data?.attributes?.type);

        const webhookData = handleWebhook(event);

        if (webhookData && webhookData.type === 'payment_success') {
            // Payment was successful - could trigger additional actions here
            // For now, we'll just log it since we verify on demand
            console.log('Payment successful via webhook:', webhookData.referenceNumber);
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(400).json({ error: 'Webhook processing failed' });
    }
});


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

        // Prepare metadata with all pin data
        const metadata = {
            referenceNumber,
            customerPhone,
            locationName,
            address: address || '',
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            correctedLatitude: correctedLatitude.toString(),
            correctedLongitude: correctedLongitude.toString()
        };

        // Build success URL with the payment reference (will be appended after payment)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const successUrl = `${baseUrl}/payment-success.html`;

        // Create payment link via PayMongo
        const payment = await createGCashPayment(
            100, // ₱100 (PayMongo minimum)
            `PinMyPlace - GPS Pin for ${locationName}`,
            metadata,
            successUrl
        );

        if (!payment.success) {
            return res.status(500).json({
                success: false,
                error: payment.error || 'Failed to create payment link'
            });
        }

        // Store pin data temporarily in a "pending" pin record
        // This will be updated to "verified" after payment confirmation
        const pendingPin = new Pin({
            pinId: generatePinId(),
            locationName,
            customerPhone,
            address: address || '',
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            correctedLatitude: parseFloat(correctedLatitude),
            correctedLongitude: parseFloat(correctedLongitude),
            paymentAmount: 100,
            paymentReferenceId: payment.referenceNumber,
            paymentStatus: 'pending',
            qrCode: generateQRCode()
        });

        await pendingPin.save();

        res.json({
            success: true,
            paymentLink: payment.paymentLink,
            referenceNumber: payment.referenceNumber
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
            paymentReferenceId,
            agentId // Optional - if sold by agent
        } = req.body;

        // Validate payment reference
        if (!paymentReferenceId) {
            return res.status(400).json({
                success: false,
                error: 'Payment reference is required'
            });
        }

        // Verify payment with PayMongo
        const paymentVerification = await verifyPayment(paymentReferenceId);

        console.log('Payment verification result:', JSON.stringify(paymentVerification, null, 2));

        if (!paymentVerification.success || !paymentVerification.isPaid) {
            return res.status(400).json({
                success: false,
                error: 'Payment not confirmed. Please complete payment first.',
                debug: paymentVerification
            });
        }

        // Find the pending pin we created earlier
        const pin = await Pin.findOne({ paymentReferenceId });

        if (!pin) {
            return res.status(404).json({
                success: false,
                error: 'Pin not found. Please create a new pin.'
            });
        }

        // Check if already verified
        if (pin.paymentStatus === 'verified') {
            return res.json({
                success: true,
                message: 'Pin already verified',
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
        }

        // Update pin status to verified and add agent if provided
        pin.paymentStatus = 'verified';
        if (agentId) {
            pin.soldByAgent = agentId;
            pin.agentCommission = 50;
        }

        await pin.save();        // If sold by agent, update agent stats
        if (agentId) {
            const Agent = require('../models/Agent');
            await Agent.findByIdAndUpdate(agentId, {
                $inc: {
                    totalPinsSold: 1,
                    totalEarnings: 50,
                    pendingCommission: 50
                }
            });
        }

        res.status(201).json({
            success: true,
            message: 'Pin created successfully!',
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
