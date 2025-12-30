/**
 * Database cleanup script
 * Removes old bulkbuyers collection
 * Run with: node scripts/cleanup-db.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        const db = mongoose.connection.db;
        
        // List all collections
        const collections = await db.listCollections().toArray();
        console.log('\nExisting collections:', collections.map(c => c.name).join(', '));

        // Drop bulkbuyers collection if it exists
        if (collections.some(c => c.name === 'bulkbuyers')) {
            console.log('\nDropping bulkbuyers collection...');
            await db.dropCollection('bulkbuyers');
            console.log('✅ Dropped bulkbuyers collection');
        } else {
            console.log('\n❌ bulkbuyers collection not found');
        }

        // Drop agents collection if it exists
        if (collections.some(c => c.name === 'agents')) {
            console.log('\nDropping agents collection...');
            await db.dropCollection('agents');
            console.log('✅ Dropped agents collection');
        }

        console.log('\n✅ Cleanup complete! You can now register with the User model.');
        console.log('New users will be created in the "users" collection with role="user"');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanup();
