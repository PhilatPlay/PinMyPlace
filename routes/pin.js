const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const Pin = require('../models/Pin');
const { createGCashPayment, verifyPayment, handleWebhook } = require('../services/paymentService');
const { createStripePayment, verifyStripePayment, handleStripeWebhook } = require('../services/stripeService');
const { createXenditPayment, verifyXenditPayment, handleXenditWebhook } = require('../services/xenditService');
const { getCurrency } = require('../config/currencies');

// Rate limiters - generous limits for agents serving multiple customers
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 payment initiations per IP (allows agents to serve customers in line)
    message: { success: false, error: 'Too many payment requests. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const verificationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // 100 verification attempts per IP
    message: { success: false, error: 'Too many verification attempts. Please try again in 5 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Input validation helpers
function isValidPhone(phone) {
    // Accept any phone number with 7-15 digits (international standard)
    // Allows: +1234567890, 09171234567, 1234567890, etc.
    const cleaned = phone.replace(/[\s\-().]/g, '');
    return /^\+?\d{7,15}$/.test(cleaned);
}

function isValidCoordinates(lat, lng) {
    // Valid global coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    return !isNaN(latitude) && !isNaN(longitude) &&
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180;
}

function sanitizeInput(input) {
    if (!input) return '';
    return validator.escape(validator.trim(input.toString()));
}

// PayMongo Webhook endpoint with signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['paymongo-signature'];
        const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

        // Verify webhook signature if secret is configured
        if (webhookSecret) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(req.body)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const event = JSON.parse(req.body.toString());
        console.log('PayMongo webhook received:', event.data?.attributes?.type);

        const webhookData = handleWebhook(event);

        if (webhookData && webhookData.type === 'payment_success') {
            console.log('Payment successful via webhook:', webhookData.referenceNumber);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error.message);
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

// Initiate payment (creates payment link) - with rate limiting
router.post('/initiate-payment', paymentLimiter, async (req, res) => {
    try {
        const {
            locationName,
            address,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude,
            customerPhone,
            currency // Optional currency code (defaults to PHP)
        } = req.body;

        // Validate required fields
        if (!locationName || !latitude || !longitude ||
            !correctedLatitude || !correctedLongitude || !customerPhone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Validate phone number (international format)
        if (!isValidPhone(customerPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Please enter a valid phone number with country code.'
            });
        }

        // Validate coordinates are valid
        if (!isValidCoordinates(latitude, longitude) ||
            !isValidCoordinates(correctedLatitude, correctedLongitude)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid GPS coordinates. Please check your location.'
            });
        }

        // Sanitize text inputs
        const sanitizedLocationName = sanitizeInput(locationName);
        const sanitizedAddress = sanitizeInput(address);

        if (sanitizedLocationName.length < 3 || sanitizedLocationName.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Location name must be between 3 and 100 characters'
            });
        }

        // Generate reference number for tracking
        const referenceNumber = 'PIN-' + Date.now().toString().slice(-8);

        // Prepare metadata with sanitized pin data
        const metadata = {
            referenceNumber,
            customerPhone,
            locationName: sanitizedLocationName,
            address: sanitizedAddress || '',
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            correctedLatitude: correctedLatitude.toString(),
            correctedLongitude: correctedLongitude.toString()
        };

        // Build success URL with the payment reference (will be appended after payment)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const successUrl = `${baseUrl}/payment-success.html`;
        const cancelUrl = `${baseUrl}?payment=cancelled`;

        // Get currency and amount
        const currencyInfo = getCurrency(currency || 'PHP');
        const paymentAmount = currencyInfo.price;

        // Payment gateway routing:
        // 1. Xendit for SE Asia e-wallets (PHP, IDR, THB, VND, MYR, SGD)
        // 2. Stripe as fallback for international cards (USD and any other)
        let payment;
        let paymentGateway = 'xendit';

        const xenditCurrencies = ['PHP', 'IDR', 'THB', 'VND', 'MYR', 'SGD'];

        if (xenditCurrencies.includes(currencyInfo.code)) {
            // Use Xendit for SE Asia (e-wallets + local payment methods)
            paymentGateway = 'xendit';
            payment = await createXenditPayment(
                paymentAmount,
                currencyInfo.code,
                `PinMyPlace - GPS Pin for ${sanitizedLocationName}`,
                metadata,
                successUrl,
                customerPhone
            );
        } else {
            // Use Stripe for international currencies (USD, etc.)
            paymentGateway = 'stripe';
            payment = await createStripePayment(
                paymentAmount,
                currencyInfo.code,
                `PinMyPlace - GPS Pin for ${sanitizedLocationName}`,
                metadata,
                successUrl,
                cancelUrl
            );
        }

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
            locationName: sanitizedLocationName,
            customerPhone,
            address: sanitizedAddress || '',
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            correctedLatitude: parseFloat(correctedLatitude),
            correctedLongitude: parseFloat(correctedLongitude),
            paymentAmount: paymentAmount,
            paymentMethod: currencyInfo.code,
            // Store chargeId for Xendit, sessionId for Stripe, referenceNumber for PayMongo
            paymentReferenceId: payment.chargeId || payment.sessionId || payment.referenceNumber,
            paymentStatus: 'pending',
            qrCode: generateQRCode()
        });

        await pendingPin.save();

        res.json({
            success: true,
            paymentLink: payment.paymentLink,
            // Return chargeId for Xendit, sessionId for Stripe, referenceNumber for PayMongo
            referenceNumber: payment.chargeId || payment.sessionId || payment.referenceNumber,
            amount: paymentAmount,
            currency: currencyInfo.code,
            currencySymbol: currencyInfo.symbol,
            gateway: paymentGateway,
            paymentMethod: payment.channelCode, // For Xendit (GCASH, OVO, etc.)
            expiresIn: '24 hours' // Payment link expires after 24 hours
        });
    } catch (error) {
        console.error('Payment initiation error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate payment'
        });
    }
});

// Create pin with payment (no login required) - with rate limiting
router.post('/create-with-payment', verificationLimiter, async (req, res) => {
    try {
        const {
            paymentReferenceId,
            agentId // Optional - if sold by agent
        } = req.body;

        console.log('Verification request:', { paymentReferenceId, agentId });

        // Validate payment reference
        if (!paymentReferenceId) {
            return res.status(400).json({
                success: false,
                error: 'Payment reference is required'
            });
        }

        // Find the pending pin first
        const pin = await Pin.findOne({ paymentReferenceId });

        console.log('Found pin:', pin ? `ID: ${pin.pinId}, Status: ${pin.paymentStatus}, Method: ${pin.paymentMethod}` : 'NOT FOUND');

        if (!pin) {
            return res.status(404).json({
                success: false,
                error: 'Pin not found or payment link expired. Please create a new pin.'
            });
        }

        // Check if pin is too old (24 hours)
        const pinAge = Date.now() - new Date(pin.createdAt).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (pinAge > maxAge && pin.paymentStatus === 'pending') {
            await Pin.deleteOne({ _id: pin._id });
            return res.status(410).json({
                success: false,
                error: 'Payment link expired. Please create a new pin.'
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

        // Verify payment with appropriate gateway
        let paymentVerification;
        const xenditCurrencies = ['PHP', 'IDR', 'THB', 'VND', 'MYR', 'SGD'];

        if (xenditCurrencies.includes(pin.paymentMethod)) {
            // SE Asia currencies use Xendit - use the stored invoice ID
            paymentVerification = await verifyXenditPayment(pin.paymentReferenceId);
        } else {
            // International currencies use Stripe - use the stored session ID
            paymentVerification = await verifyStripePayment(pin.paymentReferenceId);
        }

        if (!paymentVerification.success || !paymentVerification.isPaid) {
            return res.status(400).json({
                success: false,
                error: 'Payment not confirmed. Please complete payment first.'
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
