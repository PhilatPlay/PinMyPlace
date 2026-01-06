const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const BulkCode = require('../models/BulkCode');
const { createGCashPayment, verifyPayment } = require('../services/paymentService');
const { getCurrency } = require('../config/currencies');

// Rate limiter for bulk purchases
const bulkPurchaseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 bulk purchases per hour per IP
    message: { success: false, error: 'Too many bulk purchase requests. Please try again later.' }
});

// Calculate bulk price based on quantity and currency
function getBulkPrice(quantity, currencyCode = 'PHP') {
    const currency = getCurrency(currencyCode);
    const basePrice = currency.price;
    
    // Apply discount tiers
    if (quantity >= 50) {
        return Math.round(basePrice * 0.50); // 50% discount
    } else if (quantity >= 10) {
        return Math.round(basePrice * 0.75); // 25% discount
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

        // Create payment link
        const paymentResult = await createGCashPayment(
            totalAmount,
            `Bulk Purchase - ${quantity} dropLogik Pin Codes`,
            {
                type: 'bulk_purchase',
                quantity: quantity,
                unitPrice: unitPrice,
                currency: currency,
                email: cleanEmail,
                phone: cleanPhone
            },
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}/bulk-success.html`
        );

        if (!paymentResult.success) {
            return res.status(500).json({
                success: false,
                error: paymentResult.error
            });
        }

        res.json({
            success: true,
            paymentLink: paymentResult.paymentLink,
            referenceNumber: paymentResult.referenceNumber,
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

        // Verify payment with PayMongo
        const verification = await verifyPayment(paymentReferenceId);

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                error: 'Payment verification failed'
            });
        }

        if (!verification.isPaid) {
            return res.status(400).json({
                success: false,
                error: 'Payment not completed yet'
            });
        }

        // Extract metadata
        const metadata = verification.metadata || {};
        if (metadata.type !== 'bulk_purchase') {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment type'
            });
        }

        const quantity = parseInt(metadata.quantity);
        const unitPrice = parseFloat(metadata.unitPrice);
        const email = metadata.email;
        const phone = metadata.phone;

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
                quantity: 1, // Each code represents 1 pin
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

        res.json({
            success: true,
            message: `Successfully generated ${quantity} codes`,
            codes,
            quantity,
            unitPrice,
            totalPaid: unitPrice * quantity,
            expiresAt
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
