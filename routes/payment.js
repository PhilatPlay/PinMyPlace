const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');

// Configure multer for file uploads (payment proofs)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/payment-proofs/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Payment Model (you'll need to create this)
const Payment = require('../models/Payment');
const User = require('../models/User');

// Pricing configuration
const PRICING = {
    monthly: {
        amount: 29,
        currency: 'PHP',
        period: '1 month',
        features: ['unlimited_locations', 'custom_qr', 'no_expiration', 'priority_support']
    },
    yearly: {
        amount: 299,
        currency: 'PHP',
        period: '1 year',
        features: ['unlimited_locations', 'custom_qr', 'no_expiration', 'priority_support', 'analytics']
    }
};

// Generate payment ID
function generatePaymentId() {
    return 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Create checkout session
router.post('/create-checkout', authenticate, async (req, res) => {
    try {
        const { plan, userId } = req.body;

        if (!plan || !PRICING[plan]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid plan selected'
            });
        }

        const pricing = PRICING[plan];
        const paymentId = generatePaymentId();

        // Create payment record
        const payment = new Payment({
            paymentId,
            userId: req.user._id,
            userEmail: req.user.email,
            plan,
            amount: pricing.amount,
            currency: pricing.currency,
            status: 'pending',
            paymentMethod: 'pending',
            createdAt: new Date()
        });

        await payment.save();

        res.json({
            success: true,
            paymentId: payment.paymentId,
            amount: payment.amount,
            currency: payment.currency,
            plan: payment.plan,
            message: 'Checkout session created'
        });
    } catch (error) {
        console.error('Checkout creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
});

// Submit payment proof (GCash, PayMaya, etc.)
router.post('/submit-proof', authenticate, upload.single('paymentProof'), async (req, res) => {
    try {
        const { paymentId, method } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Payment proof image required'
            });
        }

        const payment = await Payment.findOne({ paymentId, userId: req.user._id });

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // Update payment with proof
        payment.paymentMethod = method;
        payment.paymentProof = file.path;
        payment.status = 'verification_pending';
        payment.submittedAt = new Date();

        await payment.save();

        res.json({
            success: true,
            message: 'Payment proof submitted successfully',
            payment: {
                id: payment.paymentId,
                status: payment.status
            }
        });
    } catch (error) {
        console.error('Payment proof submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit payment proof'
        });
    }
});

// Verify payment (admin can manually verify or webhook from payment provider)
router.post('/verify/:paymentId', authenticate, async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // Only allow user to check their own payment or admin to verify any
        if (payment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        res.json({
            success: true,
            payment: {
                id: payment.paymentId,
                status: payment.status,
                amount: payment.amount,
                plan: payment.plan,
                createdAt: payment.createdAt,
                verifiedAt: payment.verifiedAt
            }
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify payment'
        });
    }
});

// Admin: Approve payment
router.post('/admin/approve/:paymentId', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const payment = await Payment.findOne({ paymentId: req.params.paymentId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // Update payment status
        payment.status = 'completed';
        payment.verifiedAt = new Date();
        payment.verifiedBy = req.user._id;
        await payment.save();

        // Update user to premium
        const user = await User.findById(payment.userId);
        if (user) {
            user.isPremium = true;
            user.premiumPlan = payment.plan;

            // Set expiration date
            const expirationDate = new Date();
            if (payment.plan === 'monthly') {
                expirationDate.setMonth(expirationDate.getMonth() + 1);
            } else if (payment.plan === 'yearly') {
                expirationDate.setFullYear(expirationDate.getFullYear() + 1);
            }
            user.premiumExpiresAt = expirationDate;

            await user.save();
        }

        res.json({
            success: true,
            message: 'Payment approved and user upgraded to premium',
            payment: {
                id: payment.paymentId,
                status: payment.status,
                verifiedAt: payment.verifiedAt
            }
        });
    } catch (error) {
        console.error('Payment approval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve payment'
        });
    }
});

// Admin: Get all pending payments
router.get('/admin/pending', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const payments = await Payment.find({
            status: 'verification_pending'
        }).sort({ submittedAt: -1 });

        res.json({
            success: true,
            totalPending: payments.length,
            payments: payments.map(p => ({
                id: p.paymentId,
                userEmail: p.userEmail,
                plan: p.plan,
                amount: p.amount,
                method: p.paymentMethod,
                submittedAt: p.submittedAt,
                proofUrl: p.paymentProof
            }))
        });
    } catch (error) {
        console.error('Get pending payments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pending payments'
        });
    }
});

// Get user's payment history
router.get('/my-payments', authenticate, async (req, res) => {
    try {
        const payments = await Payment.find({
            userId: req.user._id
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            totalPayments: payments.length,
            payments: payments.map(p => ({
                id: p.paymentId,
                plan: p.plan,
                amount: p.amount,
                status: p.status,
                createdAt: p.createdAt,
                verifiedAt: p.verifiedAt
            }))
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve payment history'
        });
    }
});

module.exports = router;
