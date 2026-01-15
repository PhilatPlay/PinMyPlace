// Script to drop the unique index on paymentReferenceId from BulkCode collection
require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
        console.log('Connected to MongoDB');

        // Get the BulkCode collection
        const collection = mongoose.connection.collection('bulkcodes');

        // Drop the unique index on paymentReferenceId
        try {
            await collection.dropIndex('paymentReferenceId_1');
            console.log('✅ Successfully dropped paymentReferenceId_1 unique index');
        } catch (error) {
            if (error.code === 27 || error.codeName === 'IndexNotFound') {
                console.log('⚠️  Index paymentReferenceId_1 does not exist (already dropped or never created)');
            } else {
                throw error;
            }
        }

        // List remaining indexes
        const indexes = await collection.indexes();
        console.log('\nRemaining indexes:');
        indexes.forEach(index => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        console.log('\n✅ Done! You can now restart your server.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

dropIndex();
