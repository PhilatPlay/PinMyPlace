/**
 * Script to create a trial code in MongoDB
 * 
 * Usage:
 * node scripts/create-trial-code.js
 * 
 * Then follow the prompts to configure the trial code
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TrialCode = require('../models/TrialCode');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

async function createTrialCode() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Gather trial code information
        console.log('=== Create New Trial Code ===\n');

        const code = await question('Trial Code (e.g., ECUADOR-TRIAL-2026): ');
        const trialName = await question('Trial Name (e.g., Ecuador Postal Service Trial): ');
        const description = await question('Description (optional): ');
        
        const maxUsesInput = await question('Max Uses (leave empty for unlimited): ');
        const maxUses = maxUsesInput ? parseInt(maxUsesInput) : null;

        const expiresInput = await question('Expires At (YYYY-MM-DD, leave empty for no expiration): ');
        const expiresAt = expiresInput ? new Date(expiresInput) : null;

        const activeInput = await question('Active? (y/n, default: y): ');
        const active = !activeInput || activeInput.toLowerCase() === 'y';

        // Confirm details
        console.log('\n=== Confirm Trial Code Details ===');
        console.log(`Code: ${code.toUpperCase()}`);
        console.log(`Trial Name: ${trialName}`);
        console.log(`Description: ${description || '(none)'}`);
        console.log(`Max Uses: ${maxUses || 'Unlimited'}`);
        console.log(`Expires At: ${expiresAt ? expiresAt.toDateString() : 'Never'}`);
        console.log(`Active: ${active}`);

        const confirm = await question('\nCreate this trial code? (y/n): ');

        if (confirm.toLowerCase() !== 'y') {
            console.log('❌ Trial code creation cancelled');
            process.exit(0);
        }

        // Create trial code
        const trialCode = new TrialCode({
            code: code.toUpperCase(),
            trialName,
            description,
            maxUses,
            expiresAt,
            active
        });

        await trialCode.save();

        console.log('\n✅ Trial code created successfully!');
        console.log(`\nTrial URL: ${process.env.BASE_URL || 'http://localhost:3000'}/trial/ecuador-trial`);
        console.log(`\nCode Details:`);
        console.log(`- Code: ${trialCode.code}`);
        console.log(`- ID: ${trialCode._id}`);
        console.log(`- Created: ${trialCode.createdAt}`);

    } catch (error) {
        console.error('❌ Error creating trial code:', error.message);
        if (error.code === 11000) {
            console.error('This trial code already exists!');
        }
    } finally {
        rl.close();
        await mongoose.connection.close();
        process.exit(0);
    }
}

createTrialCode();
