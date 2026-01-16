const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const gpsRoutes = require('./routes/gps');
const paymentRoutes = require('./routes/payment');
const pinRoutes = require('./routes/pin');
const currencyRoutes = require('./routes/currency');
const bulkRoutes = require('./routes/bulk');
const trialRoutes = require('./routes/trial');

// Initialize Express
const app = express();

// Security middleware
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://pinmyplace.ph', 'https://www.pinmyplace.ph']
        : '*',
    credentials: true
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/gps', gpsRoutes);
app.use('/payment', paymentRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/trial', trialRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'PinMyPlace API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        // Drop old gcashReference index if it exists
        try {
            const Pin = require('./models/Pin');
            await Pin.collection.dropIndex('gcashReference_1');
            console.log('🗑️  Dropped old gcashReference index');
        } catch (error) {
            // Index might not exist, that's OK
            if (error.code !== 27) { // 27 = index not found
                console.log('ℹ️  Old index already removed or doesn\'t exist');
            }
        }

        // Create default admin user if it doesn't exist
        createDefaultUsers();
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Create default users for testing
async function createDefaultUsers() {
    const User = require('./models/User');

    const defaultUsers = [
        {
            email: 'team@blocklogik.com',
            password: 'Admin123!@#',
            role: 'admin',
            name: 'Admin User'
        },
        {
            email: 'user@droplogik.com',
            password: 'User123!@#',
            role: 'user',
            name: 'Test User'
        },
        {
            email: 'philip.polo@yahoo.com',
            password: 'Philip123!@#',
            role: 'admin',
            name: 'Philip Polo'
        }
    ];

    for (const userData of defaultUsers) {
        try {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const user = new User(userData);
                await user.save();
                console.log(`✅ Created default user: ${userData.email}`);
            }
        } catch (error) {
            console.error(`Error creating user ${userData.email}:`, error.message);
        }
    }
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
🚀 PinMyPlace Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server: http://localhost:${PORT}
🗺️  Frontend: http://localhost:${PORT}
🔧 API: http://localhost:${PORT}/api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

    // Cleanup abandoned pending pins every hour
    const Pin = require('./models/Pin');
    setInterval(async () => {
        try {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const result = await Pin.deleteMany({
                paymentStatus: 'pending',
                createdAt: { $lt: oneDayAgo }
            });
            if (result.deletedCount > 0) {
                console.log(`🧹 Cleaned up ${result.deletedCount} abandoned pending pin(s)`);
            }
        } catch (error) {
            console.error('Error cleaning up pending pins:', error.message);
        }
    }, 60 * 60 * 1000); // Run every hour
});

module.exports = app;
