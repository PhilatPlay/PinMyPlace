const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Location = require('../models/Location');
const { authenticate, isAdmin } = require('../middleware/auth');

// Generate unique location ID
function generateLocationId() {
    return 'LOC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Generate QR code identifier
function generateQRCode() {
    return 'QR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Register a new GPS location
router.post('/register', authenticate, async (req, res) => {
    try {
        const {
            userId,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude,
            address,
            region
        } = req.body;

        // Validate input
        if (!userId || !latitude || !longitude || !correctedLatitude || !correctedLongitude) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Generate IDs
        const locationId = generateLocationId();
        const qrCode = generateQRCode();

        // Create location
        const location = new Location({
            locationId,
            userId,
            latitude,
            longitude,
            correctedLatitude,
            correctedLongitude,
            address: address || 'GPS Location',
            qrCode,
            region: region || 'Philippines'
        });

        // Calculate correction distance
        location.correctionDistance = location.calculateCorrectionDistance();

        await location.save();

        res.status(201).json({
            success: true,
            message: 'Location registered successfully',
            locationId: location.locationId,
            qrCode: location.qrCode,
            correctionDistance: location.correctionDistance,
            location: {
                id: location.locationId,
                address: location.address,
                coordinates: {
                    lat: location.correctedLatitude,
                    lng: location.correctedLongitude
                },
                createdAt: location.createdAt,
                expiresAt: location.expiresAt
            }
        });
    } catch (error) {
        console.error('Location registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register location'
        });
    }
});

// Get location by ID
router.get('/location/:locationId', authenticate, async (req, res) => {
    try {
        const location = await Location.findOne({
            locationId: req.params.locationId,
            isActive: true
        });

        if (!location) {
            return res.status(404).json({
                success: false,
                error: 'Location not found'
            });
        }

        // Update access tracking
        location.accessCount += 1;
        location.lastAccessed = new Date();
        await location.save();

        res.json({
            success: true,
            location: {
                id: location.locationId,
                userId: location.userId,
                coordinates: {
                    original: {
                        lat: location.latitude,
                        lng: location.longitude
                    },
                    corrected: {
                        lat: location.correctedLatitude,
                        lng: location.correctedLongitude
                    }
                },
                address: location.address,
                qrCode: location.qrCode,
                correctionDistance: location.correctionDistance,
                createdAt: location.createdAt,
                expiresAt: location.expiresAt,
                accessCount: location.accessCount
            }
        });
    } catch (error) {
        console.error('Location lookup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve location'
        });
    }
});

// Get all locations for a user
router.get('/user/:userId/locations', authenticate, async (req, res) => {
    try {
        const locations = await Location.find({
            userId: req.params.userId,
            isActive: true
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            userId: req.params.userId,
            totalLocations: locations.length,
            locations: locations.map(loc => ({
                id: loc.locationId,
                address: loc.address,
                coordinates: {
                    lat: loc.correctedLatitude,
                    lng: loc.correctedLongitude
                },
                qrCode: loc.qrCode,
                createdAt: loc.createdAt,
                expiresAt: loc.expiresAt,
                accessCount: loc.accessCount
            }))
        });
    } catch (error) {
        console.error('User locations lookup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user locations'
        });
    }
});

// Enhance GPS precision (placeholder - can be expanded later)
router.post('/enhance-precision', authenticate, async (req, res) => {
    try {
        const { latitude, longitude, region } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude required'
            });
        }

        // For now, return formatted data
        // Can add more sophisticated enhancement algorithms later
        res.json({
            success: true,
            original: { latitude, longitude },
            formatted: {
                formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                dms: {
                    latitude: convertToDMS(latitude, false),
                    longitude: convertToDMS(longitude, true)
                }
            },
            precisionGrid: generatePrecisionGrid(latitude, longitude),
            suggestions: [],
            locationHash: `${latitude.toFixed(6)}_${longitude.toFixed(6)}_${region || 'PH'}`
        });
    } catch (error) {
        console.error('Precision enhancement error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enhance precision'
        });
    }
});

// Helper: Convert decimal degrees to DMS
function convertToDMS(decimal, isLongitude) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

    const direction = decimal >= 0
        ? (isLongitude ? 'E' : 'N')
        : (isLongitude ? 'W' : 'S');

    return `${degrees}°${minutes}'${seconds}"${direction}`;
}

// Helper: Generate precision grid
function generatePrecisionGrid(lat, lng) {
    const grid = [];
    const offset = 0.00001; // ~1 meter

    const positions = [
        { name: 'N', lat: lat + offset, lng },
        { name: 'S', lat: lat - offset, lng },
        { name: 'E', lat, lng: lng + offset },
        { name: 'W', lat, lng: lng - offset },
        { name: 'CENTER', lat, lng }
    ];

    positions.forEach(pos => {
        grid.push({
            gridPosition: pos.name,
            lat: pos.lat,
            lng: pos.lng,
            isCenter: pos.name === 'CENTER'
        });
    });

    return grid;
}

// Delete location (user can delete their own, admin can delete any)
router.delete('/location/:locationId', authenticate, async (req, res) => {
    try {
        const location = await Location.findOne({ locationId: req.params.locationId });

        if (!location) {
            return res.status(404).json({
                success: false,
                error: 'Location not found'
            });
        }

        // Check permissions
        if (location.userId !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this location'
            });
        }

        location.isActive = false;
        await location.save();

        res.json({
            success: true,
            message: 'Location deleted successfully'
        });
    } catch (error) {
        console.error('Location deletion error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete location'
        });
    }
});

module.exports = router;
