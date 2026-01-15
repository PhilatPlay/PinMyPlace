const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const BulkCode = require('../models/BulkCode');
const BulkPurchaseSession = require('../models/BulkPurchaseSession');
const { createGCashPayment, verifyPayment } = require('../services/paymentService');
const { createXenditPayment, verifyXenditPayment } = require('../services/xenditService');
const { createStripePayment, verifyStripePayment } = require('../services/stripeService');
const { getCurrency } = require('../config/currencies');

// Rate limiter for bulk purchases
const bulkPurchaseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 bulk purchases per hour per IP
    message: { success: false, error: 'Too many bulk purchase requests. Please try again later.' }
});

// Calculate bulk price based on quantity and currency
// 50% discount for 10+ codes
function getBulkPrice(quantity, currencyCode = 'PHP') {
    const currency = getCurrency(currencyCode);
    const basePrice = currency.price;
    
    // Apply 50% discount for all bulk purchases (10+)
    if (quantity >= 10) {
        return Math.round(basePrice * 0.50);
    }
    return null; // Not eligible for bulk pricing
}

// Validate bulk purchase input
function validateBulkPurchase(data) {
    const errors = [];

    if (!data.quantity || data.quantity < 10) {
        errors.push('Minimum bulk purchase is 10 codes');
    }

    if (!data.email || !validator.isEmail(data.email)) {
        errors.push('Valid email is required');
    }

    if (!data.phone || !/^\+?\d{7,15}$/.test(data.phone.replace(/[\s\-().]/g, ''))) {
        errors.push('Valid phone number is required');
    }

    return errors;
}

// POST /api/bulk/purchase - Initiate bulk code purchase
router.post('/purchase', bulkPurchaseLimiter, async (req, res) => {
    try {
        const { quantity, email, phone, currency = 'PHP' } = req.body;

        // Validate input
        const errors = validateBulkPurchase({ quantity, email, phone });
        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        const unitPrice = getBulkPrice(parseInt(quantity), currency);
        if (!unitPrice) {
            return res.status(400).json({ 
                success: false, 
                error: 'Minimum bulk purchase is 10 codes' 
            });
        }

        const totalAmount = unitPrice * parseInt(quantity);
        const cleanEmail = validator.normalizeEmail(email);
        const cleanPhone = phone.replace(/[\s\-().]/g, '');
        const currencyInfo = getCurrency(currency);

        const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bulk-success.html`;
        const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bulk-purchase.html?payment=cancelled`;

        // Generate a unique reference ID for tracking
        const referenceNumber = `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const metadata = {
            type: 'bulk_purchase',
            quantity: quantity,
            unitPrice: unitPrice,
            currency: currency,
            email: cleanEmail,
            phone: cleanPhone,
            referenceNumber: referenceNumber
        };

        // Payment gateway routing:
        // 1. Xendit for SE Asia e-wallets (PHP, IDR, THB, MYR, SGD, VND)
        // 2. Stripe for international currencies (USD, HKD, etc.)
        let paymentResult;
        let paymentGateway;

        // Currencies supported by Xendit
        const xenditCurrencies = ['PHP', 'IDR', 'THB', 'MYR', 'SGD', 'VND'];

        if (xenditCurrencies.includes(currencyInfo.code)) {
            // Use Xendit for SE Asia (e-wallets + local payment methods)
            paymentGateway = 'xendit';
            paymentResult = await createXenditPayment(
                totalAmount,
                currency,
                `Bulk Purchase - ${quantity} dropLogik Pin Codes`,
                metadata,
                successUrl,
                cleanPhone
            );
        } else {
            // Use Stripe for international currencies (USD, HKD, etc.)
            paymentGateway = 'stripe';
            paymentResult = await createStripePayment(
                totalAmount,
                currencyInfo.code,
                `Bulk Purchase - ${quantity} dropLogik Pin Codes`,
                metadata,
                successUrl,
                cancelUrl
            );
        }

        if (!paymentResult.success) {
            return res.status(500).json({
                success: false,
                error: paymentResult.error
            });
        }

        // For Xendit, use the referenceNumber we generated (BULK-xxx)
        // For Stripe, use the sessionId
        const paymentRef = paymentGateway === 'xendit' 
            ? referenceNumber 
            : (paymentResult.sessionId || paymentResult.referenceNumber);

        // Save purchase session to database (survives payment gateway redirects)
        const session = new BulkPurchaseSession({
            paymentReferenceId: paymentRef,
            quantity: parseInt(quantity),
            unitPrice: unitPrice,
            totalAmount: totalAmount,
            currency: currency,
            email: cleanEmail,
            phone: cleanPhone,
            paymentGateway: paymentGateway,
            status: 'pending'
        });
        
        await session.save();
        console.log('Bulk purchase session saved:', paymentRef);

        res.json({
            success: true,
            paymentLink: paymentResult.paymentLink,
            referenceNumber: paymentRef,
            paymentGateway: paymentGateway,
            quantity: quantity,
            unitPrice: unitPrice,
            totalAmount: totalAmount,
            currency: currencyInfo
        });

    } catch (error) {
        console.error('Bulk purchase error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process bulk purchase'
        });
    }
});

// POST /api/bulk/verify-and-generate - Verify payment and generate codes
router.post('/verify-and-generate', async (req, res) => {
    try {
        const { paymentReferenceId } = req.body;

        if (!paymentReferenceId) {
            return res.status(400).json({
                success: false,
                error: 'Payment reference ID is required'
            });
        }

        // Check if codes already generated for this payment
        const existingCodes = await BulkCode.findOne({ paymentReferenceId });
        if (existingCodes) {
            // Return existing codes
            const allCodes = await BulkCode.find({ paymentReferenceId }).select('code isUsed expiresAt');
            return res.json({
                success: true,
                message: 'Codes already generated',
                codes: allCodes,
                quantity: allCodes.length
            });
        }

        // First, try to find the session by the reference ID (for Xendit which uses our custom ref)
        let session = await BulkPurchaseSession.findOne({ paymentReferenceId });
        
        // If not found, it might be a Stripe session ID, so search by that field
        if (!session) {
            // For Stripe, the paymentReferenceId IS the session ID
            // So we need to search by a field that stores the actual payment gateway ID
            // Let's search all sessions and match
            const allSessions = await BulkPurchaseSession.find({ status: 'pending' });
            for (const s of allSessions) {
                // Try verifying with this session's stored reference
                if (s.paymentReferenceId === paymentReferenceId) {
                    session = s;
                    break;
                }
            }
        }
        
        console.log('Session lookup result:', session ? 'found' : 'not found');

        // Try verifying with both payment gateways (we don't know which was used)
        let verification;
        let paymentGateway = 'unknown';
        
        console.log('Attempting to verify payment:', paymentReferenceId);
        
        // Try Xendit first (most SE Asia currencies)
        verification = await verifyXenditPayment(paymentReferenceId);
        
        if (verification.success && verification.isPaid) {
            paymentGateway = 'xendit';
            console.log('Payment verified with Xendit');
        } else {
            // If Xendit fails, try Stripe (for USD, HKD, etc.)
            console.log('Xendit verification failed, trying Stripe...');
            verification = await verifyStripePayment(paymentReferenceId);
            if (verification.success && verification.isPaid) {
                paymentGateway = 'stripe';
                console.log('Payment verified with Stripe');
            }
        }

        console.log('Verification result:', { 
            success: verification.success, 
            isPaid: verification.isPaid,
            gateway: paymentGateway,
            metadata: verification.metadata 
        });

        if (!verification.success) {
            console.error('Payment verification failed for:', paymentReferenceId);
            return res.status(400).json({
                success: false,
                error: 'Payment verification failed. Please contact support with your payment reference.'
            });
        }

        if (!verification.isPaid) {
            return res.status(400).json({
                success: false,
                error: 'Payment not completed yet. Please wait a moment and try again.'
            });
        }

        // Retrieve purchase session from database
        if (!session) {
            session = await BulkPurchaseSession.findOne({ paymentReferenceId });
        }
        
        if (!session) {
            console.error('No purchase session found for:', paymentReferenceId);
            return res.status(400).json({
                success: false,
                error: 'Purchase session not found. Please contact support with your payment reference.'
            });
        }
        
        if (session.status === 'completed') {
            console.log('Session already completed, returning existing codes');
            // Return existing codes if session was already processed
            const allCodes = await BulkCode.find({ paymentReferenceId }).select('code isUsed expiresAt');
            if (allCodes.length > 0) {
                return res.json({
                    success: true,
                    message: 'Codes already generated',
                    codes: allCodes,
                    quantity: allCodes.length
                });
            }
        }

        const quantity = session.quantity;
        const unitPrice = session.unitPrice;
        const email = session.email;
        const phone = session.phone;
        const currency = session.currency;
        
        console.log('Retrieved session data:', { quantity, unitPrice, email, phone, currency });

        // Generate unique codes
        const codes = [];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 180); // 180 days validity

        for (let i = 0; i < quantity; i++) {
            let code;
            let isUnique = false;

            // Keep trying until we get a unique code
            while (!isUnique) {
                code = BulkCode.generateCode();
                const existing = await BulkCode.findOne({ code });
                if (!existing) {
                    isUnique = true;
                }
            }

            const bulkCode = new BulkCode({
                code,
                purchaseEmail: email,
                purchasePhone: phone,
                unitPrice,
                totalPaid: unitPrice,
                paymentReferenceId,
                expiresAt
            });

            await bulkCode.save();
            codes.push({
                code: bulkCode.code,
                expiresAt: bulkCode.expiresAt
            });
        }

        // Mark session as completed
        session.status = 'completed';
        await session.save();
        console.log('Bulk purchase completed, codes generated:', codes.length);

        // Get currency info for display
        const currencyInfo = getCurrency(currency);

        res.json({
            success: true,
            message: `Successfully generated ${quantity} codes`,
            codes,
            quantity,
            unitPrice,
            totalPaid: unitPrice * quantity,
            expiresAt,
            currency: currencyInfo
        });

    } catch (error) {
        console.error('Code generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate codes'
        });
    }
});

// POST /api/bulk/validate-code - Check if a code is valid (before creating pin)
router.post('/validate-code', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Code is required'
            });
        }

        const bulkCode = await BulkCode.findOne({ code: code.toUpperCase() });

        if (!bulkCode) {
            return res.json({
                success: false,
                valid: false,
                error: 'Invalid code'
            });
        }

        if (bulkCode.isUsed) {
            return res.json({
                success: false,
                valid: false,
                error: 'Code already used'
            });
        }

        if (new Date() > bulkCode.expiresAt) {
            return res.json({
                success: false,
                valid: false,
                error: 'Code expired'
            });
        }

        res.json({
            success: true,
            valid: true,
            expiresAt: bulkCode.expiresAt
        });

    } catch (error) {
        console.error('Code validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate code'
        });
    }
});

module.exports = router;
