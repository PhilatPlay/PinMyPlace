const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const Pin = require('../models/Pin');
const BulkCode = require('../models/BulkCode');
const TrialCode = require('../models/TrialCode');
// PayMongo removed - not in use
const { createStripePayment, verifyStripePayment, handleStripeWebhook } = require('../services/stripeService');
const { createPaymentIntent, retrievePaymentIntent } = require('../services/stripePaymentIntents');
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

// PayMongo webhook removed - service no longer in use


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
        // 1. Xendit for SE Asia e-wallets (PHP, IDR, THB, MYR, SGD) - supports GCash directly
        // 2. Stripe Payment Intents for LATAM (MXN, BRL, COP, ARS) - supports OXXO, Pix, Boleto, PSE
        // 3. Stripe Checkout for other currencies (VND, USD, HKD)
        let payment;
        let paymentGateway = 'xendit';
        let usePaymentIntents = false;

        // Currencies enabled in Xendit account (Southeast Asia)
        const xenditCurrencies = ['PHP', 'IDR', 'THB', 'MYR', 'SGD'];
        // LATAM currencies that need Payment Intents for local payment methods
        const latamCurrencies = ['MXN', 'BRL', 'COP', 'ARS'];

        if (xenditCurrencies.includes(currencyInfo.code)) {
            // Use Xendit for SE Asia (e-wallets + local payment methods including GCash)
            paymentGateway = 'xendit';
            payment = await createXenditPayment(
                paymentAmount,
                currencyInfo.code,
                `PinMyPlace - GPS Pin for ${sanitizedLocationName}`,
                metadata,
                successUrl,
                customerPhone
            );
        } else if (latamCurrencies.includes(currencyInfo.code)) {
            // Use Stripe Payment Intents for LATAM (supports OXXO, Pix, Boleto, PSE, etc.)
            paymentGateway = 'stripe-intents';
            usePaymentIntents = true;
            
            const pinId = generatePinId(); // Generate pinId upfront for metadata
            payment = await createPaymentIntent(
                paymentAmount,
                currencyInfo.code,
                `PinMyPlace - GPS Pin for ${sanitizedLocationName}`,
                {
                    ...metadata,
                    pinId, // Include for webhook processing
                    gateway: 'stripe-intents'
                },
                null, // customerEmail - optional
                successUrl
            );
            
            // Store pinId for later use
            metadata.pinId = pinId;
        } else {
            // Use Stripe Checkout for international currencies (VND, USD, HKD, etc.)
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

        // Store external reference based on gateway
        let storedPaymentReferenceId;
        if (paymentGateway === 'xendit') {
            storedPaymentReferenceId = payment.referenceNumber || payment.chargeId;
        } else if (paymentGateway === 'stripe-intents') {
            storedPaymentReferenceId = payment.paymentIntentId;
        } else {
            storedPaymentReferenceId = payment.sessionId || payment.referenceNumber || payment.chargeId;
        }

        // Prepare drone data if provided
        const droneEnabled = req.body.droneEnabled === 'true' || req.body.droneEnabled === true;
        const droneData = droneEnabled ? {
            landingZoneType: req.body.landingZoneType || null,
            dropZoneDimensions: {
                width: req.body.dropZoneWidth ? parseFloat(req.body.dropZoneWidth) : null,
                length: req.body.dropZoneLength ? parseFloat(req.body.dropZoneLength) : null
            },
            elevation: null, // Can be fetched from elevation API later
            heightAboveGround: req.body.heightAboveGround ? parseFloat(req.body.heightAboveGround) : null,
            floorNumber: req.body.floorNumber || null,
            obstacles: req.body.droneObstacles || null,
            accessRestrictions: req.body.accessRestrictions || null,
            approachDirection: req.body.approachDirection || null,
            notes: req.body.droneNotes || null
        } : undefined;

        // Store pin data temporarily in a "pending" pin record
        // This will be updated to "verified" after payment confirmation
        const pendingPin = new Pin({
            pinId: metadata.pinId || generatePinId(),
            locationName: sanitizedLocationName,
            customerPhone,
            address: sanitizedAddress || '',
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            correctedLatitude: parseFloat(correctedLatitude),
            correctedLongitude: parseFloat(correctedLongitude),
            paymentAmount: paymentAmount,
            paymentMethod: currencyInfo.code,
            paymentReferenceId: storedPaymentReferenceId,
            paymentProvider: paymentGateway,
            paymentStatus: 'pending',
            qrCode: generateQRCode(),
            droneEnabled,
            droneData
        });

        await pendingPin.save();

        // For Payment Intents, return client secret for frontend
        if (usePaymentIntents) {
            res.json({
                success: true,
                usePaymentIntents: true,
                clientSecret: payment.clientSecret,
                paymentIntentId: payment.paymentIntentId,
                referenceNumber: storedPaymentReferenceId,
                amount: paymentAmount,
                currency: currencyInfo.code,
                currencySymbol: currencyInfo.symbol,
                gateway: paymentGateway,
                pinId: pendingPin._id.toString(),
                expiresIn: '24 hours'
            });
        } else {
            // For regular payments, return payment link
            res.json({
                success: true,
                paymentLink: payment.paymentLink,
                referenceNumber: storedPaymentReferenceId,
                amount: paymentAmount,
                currency: currencyInfo.code,
                currencySymbol: currencyInfo.symbol,
                gateway: paymentGateway,
                paymentMethod: payment.channelCode, // For Xendit (GCASH, OVO, etc.)
                expiresIn: '24 hours' // Payment link expires after 24 hours
            });
        }

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
        let pin = await Pin.findOne({ paymentReferenceId });
        let xenditFallbackVerification = null;

        // Backward-compatible lookup for Xendit external IDs (e.g., PIN-xxxx)
        if (!pin && (paymentReferenceId.startsWith('PIN-') || paymentReferenceId.startsWith('XEN-') || paymentReferenceId.startsWith('BULK-'))) {
            xenditFallbackVerification = await verifyXenditPayment(paymentReferenceId);
            if (xenditFallbackVerification.success && xenditFallbackVerification.invoiceId) {
                pin = await Pin.findOne({ paymentReferenceId: xenditFallbackVerification.invoiceId });
            }
        }

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
        const xenditCurrencies = ['PHP', 'IDR', 'THB', 'MYR', 'SGD'];
        const latamCurrencies = ['MXN', 'BRL', 'COP', 'ARS'];

        if (xenditCurrencies.includes(pin.paymentMethod)) {
            // SE Asia currencies use Xendit - use the stored invoice or external ID
            paymentVerification = xenditFallbackVerification || await verifyXenditPayment(pin.paymentReferenceId);
        } else if (latamCurrencies.includes(pin.paymentMethod) || pin.paymentProvider === 'stripe-intents') {
            // LATAM currencies use Stripe Payment Intents
            const intentResult = await retrievePaymentIntent(pin.paymentReferenceId);
            if (intentResult.success) {
                paymentVerification = {
                    success: true,
                    isPaid: intentResult.paymentIntent.status === 'succeeded',
                    status: intentResult.paymentIntent.status,
                    amount: intentResult.paymentIntent.amount / 100,
                    currency: intentResult.paymentIntent.currency
                };
            } else {
                paymentVerification = { success: false, isPaid: false };
            }
        } else {
            // International currencies use Stripe Checkout - use the stored session ID
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
                error: 'Pin not found'
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

// Renew endpoint (kept for backwards compatibility but pins never expire)
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

        // Pins don't expire, but update payment info
        pin.expiresAt = null;
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

// Create pin with access code (bulk purchase redemption)
router.post('/create-with-code', verificationLimiter, async (req, res) => {
    try {
        const {
            accessCode,
            locationName,
            customerPhone,
            address,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude
        } = req.body;

        // Validate access code
        if (!accessCode) {
            return res.status(400).json({
                success: false,
                error: 'Access code is required'
            });
        }

        // Find and validate the code
        const bulkCode = await BulkCode.findOne({ code: accessCode.toUpperCase() });

        if (!bulkCode) {
            return res.status(400).json({
                success: false,
                error: 'Invalid access code'
            });
        }

        if (bulkCode.isUsed) {
            return res.status(400).json({
                success: false,
                error: 'This code has already been used',
                usedAt: bulkCode.usedAt
            });
        }

        if (new Date() > bulkCode.expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'This code has expired',
                expiredAt: bulkCode.expiresAt
            });
        }

        // Validate phone number
        if (!isValidPhone(customerPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Valid phone number is required'
            });
        }

        // Validate coordinates
        if (!isValidCoordinates(latitude, longitude) ||
            !isValidCoordinates(correctedLatitude, correctedLongitude)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid GPS coordinates'
            });
        }

        // Sanitize inputs
        const sanitizedLocationName = sanitizeInput(locationName);
        const sanitizedAddress = sanitizeInput(address || '');

        if (sanitizedLocationName.length < 3 || sanitizedLocationName.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Location name must be between 3 and 100 characters'
            });
        }

        // Generate QR code URL
        const qrUrl = `https://www.google.com/maps?q=${correctedLatitude},${correctedLongitude}`;

        // Prepare drone data if provided
        const droneEnabled = req.body.droneEnabled === 'true' || req.body.droneEnabled === true;
        const droneData = droneEnabled ? {
            landingZoneType: req.body.landingZoneType || null,
            dropZoneDimensions: {
                width: req.body.dropZoneWidth ? parseFloat(req.body.dropZoneWidth) : null,
                length: req.body.dropZoneLength ? parseFloat(req.body.dropZoneLength) : null
            },
            elevation: null, // Can be fetched from elevation API later
            heightAboveGround: req.body.heightAboveGround ? parseFloat(req.body.heightAboveGround) : null,
            floorNumber: req.body.floorNumber || null,
            obstacles: req.body.droneObstacles || null,
            accessRestrictions: req.body.accessRestrictions || null,
            approachDirection: req.body.approachDirection || null,
            notes: req.body.droneNotes || null
        } : undefined;

        // Create the pin
        const newPin = new Pin({
            pinId: generatePinId(),
            locationName: sanitizedLocationName,
            customerPhone,
            address: sanitizedAddress,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            correctedLatitude: parseFloat(correctedLatitude),
            correctedLongitude: parseFloat(correctedLongitude),
            paymentAmount: bulkCode.unitPrice,
            paymentMethod: 'bulk_code',
            paymentReferenceId: `CODE-${accessCode}`,
            paymentStatus: 'code_redeemed',
            redeemedCode: accessCode.toUpperCase(),
            redemptionMethod: 'bulk_code',
            qrCode: qrUrl,
            isActive: true,
            droneEnabled,
            droneData
        });

        await newPin.save();

        // Mark code as used
        bulkCode.isUsed = true;
        bulkCode.usedAt = new Date();
        bulkCode.usedByPhone = customerPhone;
        bulkCode.redeemedPinId = newPin.pinId;
        await bulkCode.save();

        console.log(`✅ Pin created with code: ${accessCode} for ${customerPhone}`);

        res.json({
            success: true,
            message: 'Pin created successfully with access code!',
            pin: {
                pinId: newPin.pinId,
                qrCode: newPin.qrCode,
                locationName: newPin.locationName,
                address: newPin.address,
                correctedLatitude: newPin.correctedLatitude,
                correctedLongitude: newPin.correctedLongitude,
                createdAt: newPin.createdAt,
                redemptionMethod: 'bulk_code'
            }
        });

    } catch (error) {
        console.error('Code redemption error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create pin with access code'
        });
    }
});

// Create pin with trial code
router.post('/create-with-trial', verificationLimiter, async (req, res) => {
    try {
        const {
            trialCode,
            locationName,
            customerPhone,
            address,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude,
            correctionDistance
        } = req.body;

        // Validate trial code
        if (!trialCode) {
            return res.status(400).json({
                success: false,
                error: 'Trial code is required'
            });
        }

        // Find and validate the trial code
        const trial = await TrialCode.findOne({ code: trialCode.toUpperCase() });

        if (!trial) {
            return res.status(400).json({
                success: false,
                error: 'Invalid trial code'
            });
        }

        // Check if trial code is valid
        const validation = trial.isValid();
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.reason
            });
        }

        // Validate phone number
        if (!isValidPhone(customerPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Valid phone number is required'
            });
        }

        // Validate coordinates
        if (!isValidCoordinates(latitude, longitude) ||
            !isValidCoordinates(correctedLatitude, correctedLongitude)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid GPS coordinates'
            });
        }

        // Sanitize inputs
        const sanitizedLocationName = sanitizeInput(locationName);
        const sanitizedAddress = sanitizeInput(address || '');

        if (sanitizedLocationName.length < 3 || sanitizedLocationName.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Location name must be between 3 and 100 characters'
            });
        }

        // Generate QR code URL
        const qrUrl = `https://www.google.com/maps?q=${correctedLatitude},${correctedLongitude}`;

        // Create the pin
        const newPin = new Pin({
            pinId: generatePinId(),
            locationName: sanitizedLocationName,
            customerPhone,
            address: sanitizedAddress,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            correctedLatitude: parseFloat(correctedLatitude),
            correctedLongitude: parseFloat(correctedLongitude),
            correctionDistance: correctionDistance || 0,
            paymentAmount: 0, // Trial pins are free
            paymentMethod: 'trial',
            paymentReferenceId: `TRIAL-${trialCode}-${Date.now()}`,
            paymentStatus: 'code_redeemed',
            redeemedCode: trialCode.toUpperCase(),
            redemptionMethod: 'bulk_code', // Reuse existing field
            qrCode: qrUrl,
            isActive: true
        });

        await newPin.save();

        // Increment trial usage
        await trial.incrementUsage();

        console.log(`✅ Trial pin created with code: ${trialCode} for ${customerPhone}`);

        res.json({
            success: true,
            message: 'Pin created successfully with trial code!',
            pin: {
                pinId: newPin.pinId,
                qrCode: newPin.qrCode,
                locationName: newPin.locationName,
                address: newPin.address,
                correctedLatitude: newPin.correctedLatitude,
                correctedLongitude: newPin.correctedLongitude,
                createdAt: newPin.createdAt
            }
        });

    } catch (error) {
        console.error('Trial code redemption error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create pin with trial code'
        });
    }
});

module.exports = router;
