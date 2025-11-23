const express = require('express');
const router = express.Router();
const { getAllCurrencies, getCurrency, CURRENCIES } = require('../config/currencies');

// Country to currency mapping
const COUNTRY_TO_CURRENCY = {
    'PH': 'PHP',
    'MY': 'MYR',
    'SG': 'SGD',
    'TH': 'THB',
    'ID': 'IDR',
    'VN': 'VND',
    'US': 'USD',
    'HK': 'HKD'
};

/**
 * Get currency based on user's country (from IP geolocation)
 * GET /api/currency/detect
 * Query params: ?override=MYR (optional, for testing)
 */
router.get('/detect', async (req, res) => {
    try {
        let countryCode;

        // Allow manual override for testing (e.g., ?override=MYR)
        const overrideCurrency = req.query.override;
        if (overrideCurrency && CURRENCIES[overrideCurrency]) {
            const currency = getCurrency(overrideCurrency);
            return res.json({
                success: true,
                countryCode: 'OVERRIDE',
                currency: {
                    code: currency.code,
                    symbol: currency.symbol,
                    name: currency.name,
                    price: currency.price,
                    country: currency.country,
                    flag: currency.flag
                }
            });
        }

        // Try to get country from Cloudflare header (if using Cloudflare)
        countryCode = req.headers['cf-ipcountry'];

        // Fallback: try other common geolocation headers
        if (!countryCode) {
            countryCode = req.headers['x-country-code'] ||
                req.headers['x-geoip-country-code'];
        }

        // Default to US if no country detected
        if (!countryCode || !COUNTRY_TO_CURRENCY[countryCode]) {
            countryCode = 'US';
        }

        const currencyCode = COUNTRY_TO_CURRENCY[countryCode];
        const currency = getCurrency(currencyCode);

        res.json({
            success: true,
            countryCode: countryCode,
            currency: {
                code: currency.code,
                symbol: currency.symbol,
                name: currency.name,
                price: currency.price,
                country: currency.country,
                flag: currency.flag
            }
        });

    } catch (error) {
        console.error('Currency detection error:', error);
        // Default to PHP on error
        const defaultCurrency = getCurrency('PHP');
        res.json({
            success: true,
            countryCode: 'PH',
            currency: {
                code: defaultCurrency.code,
                symbol: defaultCurrency.symbol,
                name: defaultCurrency.name,
                price: defaultCurrency.price,
                country: defaultCurrency.country,
                flag: defaultCurrency.flag
            }
        });
    }
});

/**
 * Get all available currencies
 * GET /api/currency/list
 */
router.get('/list', (req, res) => {
    res.json({
        success: true,
        currencies: getAllCurrencies()
    });
});

module.exports = router;
