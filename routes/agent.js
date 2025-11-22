const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const Pin = require('../models/Pin');

// Agent authentication middleware
const authenticateAgent = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const agent = await Agent.findById(decoded.agentId);

        if (!agent || !agent.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token or agent not found'
            });
        }

        // Check if subscription is active
        if (!agent.hasActiveSubscription()) {
            return res.status(403).json({
                success: false,
                error: 'Subscription expired. Please renew to continue selling pins.'
            });
        }

        req.agent = agent;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

// Generate agent ID
function generateAgentId() {
    return 'AGT-' + Date.now().toString().slice(-6);
}

// Agent registration (admin only for now, or self-signup with payment)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, phone, payoutMethod, payoutDetails } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'All fields required'
            });
        }

        // Check if agent already exists
        const existingAgent = await Agent.findOne({ email });
        if (existingAgent) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const agentId = generateAgentId();

        const agent = new Agent({
            agentId,
            email,
            password,
            name,
            phone,
            payoutMethod: payoutMethod || 'gcash',
            payoutDetails
        });

        await agent.save();

        // Generate token
        const token = jwt.sign(
            { agentId: agent._id, email: agent.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'Agent registered successfully! 7-day trial started.',
            token,
            agent: agent.toJSON()
        });
    } catch (error) {
        console.error('Agent registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

// Agent login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password required'
            });
        }

        const agent = await Agent.findOne({ email });
        if (!agent) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (!agent.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account disabled'
            });
        }

        const isMatch = await agent.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update last login
        agent.lastLoginAt = new Date();
        await agent.save();

        // Generate token
        const token = jwt.sign(
            { agentId: agent._id, email: agent.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            agent: agent.toJSON()
        });
    } catch (error) {
        console.error('Agent login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// Get agent stats
router.get('/stats', authenticateAgent, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Get today's pins
        const todayPins = await Pin.find({
            soldByAgent: req.agent._id,
            createdAt: { $gte: today }
        });

        // Get this month's pins
        const monthPins = await Pin.find({
            soldByAgent: req.agent._id,
            createdAt: { $gte: firstDayOfMonth }
        });

        // Get recent sales
        const recentSales = await Pin.find({
            soldByAgent: req.agent._id
        }).sort({ createdAt: -1 }).limit(10);

        res.json({
            success: true,
            today: {
                count: todayPins.length,
                earnings: todayPins.length * 25
            },
            month: {
                count: monthPins.length,
                earnings: monthPins.length * 25
            },
            total: {
                count: req.agent.totalPinsSold,
                earnings: req.agent.totalEarnings,
                pending: req.agent.pendingCommission
            },
            recentSales: recentSales.map(pin => ({
                pinId: pin.pinId,
                locationName: pin.locationName,
                createdAt: pin.createdAt
            }))
        });
    } catch (error) {
        console.error('Agent stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve stats'
        });
    }
});

// Request payout
router.post('/request-payout', authenticateAgent, async (req, res) => {
    try {
        if (req.agent.pendingCommission < 100) {
            return res.status(400).json({
                success: false,
                error: 'Minimum payout is ₱100'
            });
        }

        // Create payout request (you would add a PayoutRequest model)
        // For now, just send notification to admin

        res.json({
            success: true,
            message: `Payout request for ₱${req.agent.pendingCommission} submitted. You will receive payment within 1-2 business days.`,
            amount: req.agent.pendingCommission
        });
    } catch (error) {
        console.error('Payout request error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to request payout'
        });
    }
});

module.exports = router;
