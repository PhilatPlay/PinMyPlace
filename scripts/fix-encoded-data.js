const mongoose = require('mongoose');
const Pin = require('../models/Pin');
require('dotenv').config();

// Decode HTML entities
function decodeHtmlEntities(text) {
    if (!text) return text;
    
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#x5C;': '\\',
        '&#96;': '`',
        '&#x3D;': '='
    };
    
    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
        decoded = decoded.split(entity).join(char);
    }
    
    return decoded;
}

async function fixEncodedData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all pins with HTML entities in locationName or address
        const pins = await Pin.find({
            $or: [
                { locationName: /&#/ },
                { address: /&#/ }
            ]
        });

        console.log(`Found ${pins.length} pins with HTML entities`);

        let fixedCount = 0;
        for (const pin of pins) {
            const updates = {};
            
            if (pin.locationName && pin.locationName.includes('&#')) {
                updates.locationName = decodeHtmlEntities(pin.locationName);
                console.log(`Pin ${pin.pinId}: "${pin.locationName}" → "${updates.locationName}"`);
            }
            
            if (pin.address && pin.address.includes('&#')) {
                updates.address = decodeHtmlEntities(pin.address);
                console.log(`Pin ${pin.pinId} address: "${pin.address}" → "${updates.address}"`);
            }

            if (Object.keys(updates).length > 0) {
                await Pin.findByIdAndUpdate(pin._id, updates);
                fixedCount++;
            }
        }

        console.log(`\n✅ Fixed ${fixedCount} pins with HTML entities`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixEncodedData();
