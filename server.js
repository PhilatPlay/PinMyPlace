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
const agentRoutes = require('./routes/agent');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/auth', authRoutes);
app.use('/gps', gpsRoutes);
app.use('/payment', paymentRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/agent', agentRoutes);

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
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('✅ Connected to MongoDB');

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
            email: 'partner@droplogik.com',
            password: 'Partner123!@#',
            role: 'partner',
            name: 'Test Partner'
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
});

module.exports = app;
