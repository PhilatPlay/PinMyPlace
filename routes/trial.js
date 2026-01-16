const express = require('express');
const router = express.Router();
const path = require('path');
const TrialCode = require('../models/TrialCode');

// Trial configurations for different trials
const trialConfigs = {
    'ecuador-trial': {
        name: 'Ecuador Postal Service Trial',
        description: 'Exclusive trial for Ecuador Postal Service',
        colors: {
            primary: '#FFD100',    // Yellow from Ecuador flag
            secondary: '#0039A6',  // Blue from Ecuador flag
            accent: '#ED1C24'      // Red from Ecuador flag
        },
        htmlFile: 'ecuador-trial.html'
    }
    // Add more trials here as needed
};

// Serve trial page
router.get('/:trialSlug', (req, res) => {
    const { trialSlug } = req.params;
    const config = trialConfigs[trialSlug];
    
    if (!config) {
        return res.status(404).send('Trial not found');
    }
    
    res.sendFile(path.join(__dirname, '../public', config.htmlFile));
});

// Get trial configuration
router.get('/api/:trialSlug/config', (req, res) => {
    const { trialSlug } = req.params;
    const config = trialConfigs[trialSlug];
    
    if (!config) {
        return res.status(404).json({ error: 'Trial not found' });
    }
    
    res.json(config);
});

// Validate trial code
router.post('/api/validate-code', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trial code is required' 
            });
        }
        
        const trialCode = await TrialCode.findOne({ code: code.toUpperCase() });
        
        if (!trialCode) {
            return res.status(404).json({ 
                success: false, 
                error: 'Invalid trial code' 
            });
        }
        
        const validation = trialCode.isValid();
        
        if (!validation.valid) {
            return res.status(400).json({ 
                success: false, 
                error: validation.reason 
            });
        }
        
        res.json({ 
            success: true,
            trialName: trialCode.trialName,
            remainingUses: trialCode.maxUses ? (trialCode.maxUses - trialCode.usedCount) : null,
            expiresAt: trialCode.expiresAt
        });
        
    } catch (error) {
        console.error('Trial code validation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error validating trial code' 
        });
    }
});

module.exports = router;
