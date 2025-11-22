// Standalone script to seed users if needed
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const users = [
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

async function seedUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        for (const userData of users) {
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                console.log(`✓ User already exists: ${userData.email}`);
            } else {
                const user = new User(userData);
                await user.save();
                console.log(`✅ Created user: ${userData.email} (${userData.role})`);
            }
        }

        console.log('\n✅ User seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
