// Currency configuration for Southeast Asia
// Prices are equivalent to ~$3 USD base price
// Exchange rates updated as of Nov 2025

const BASE_PRICE_USD = 3.00;

const CURRENCIES = {
    PHP: {
        code: 'PHP',
        symbol: '₱',
        name: 'Philippine Peso',
        price: 150,
        country: 'Philippines',
        flag: '🇵🇭',
        exchangeRate: 50  // 1 USD = 50 PHP
    },
    MYR: {
        code: 'MYR',
        symbol: 'RM',
        name: 'Malaysian Ringgit',
        price: 15,
        country: 'Malaysia',
        flag: '🇲🇾',
        exchangeRate: 5  // 1 USD = 5 MYR
    },
    SGD: {
        code: 'SGD',
        symbol: 'S$',
        name: 'Singapore Dollar',
        price: 4.5,
        country: 'Singapore',
        flag: '🇸🇬',
        exchangeRate: 1.5  // 1 USD = 1.5 SGD
    },
    THB: {
        code: 'THB',
        symbol: '฿',
        name: 'Thai Baht',
        price: 105,
        country: 'Thailand',
        flag: '🇹🇭',
        exchangeRate: 35  // 1 USD = 35 THB
    },
    IDR: {
        code: 'IDR',
        symbol: 'Rp',
        name: 'Indonesian Rupiah',
        price: 48000,
        country: 'Indonesia',
        flag: '🇮🇩',
        exchangeRate: 16000  // 1 USD = 16,000 IDR
    },
    VND: {
        code: 'VND',
        symbol: '₫',
        name: 'Vietnamese Dong',
        price: 75000,
        country: 'Vietnam',
        flag: '🇻🇳',
        exchangeRate: 25000  // 1 USD = 25,000 VND
    },
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        price: 3,
        country: 'International',
        flag: '🌏',
        exchangeRate: 1  // Base currency
    },
    HKD: {
        code: 'HKD',
        symbol: 'HK$',
        name: 'Hong Kong Dollar',
        price: 24,
        country: 'Hong Kong',
        flag: '🇭🇰',
        exchangeRate: 8  // 1 USD = 8 HKD
    }
};

// Get currency by country code or default to PHP
function getCurrencyByCountry(countryCode) {
    const currencyMap = {
        'PH': 'PHP',
        'MY': 'MYR',
        'SG': 'SGD',
        'TH': 'THB',
        'ID': 'IDR',
        'VN': 'VND'
    };

    return CURRENCIES[currencyMap[countryCode]] || CURRENCIES.PHP;
}

// Get currency by code
function getCurrency(code) {
    return CURRENCIES[code] || CURRENCIES.PHP;
}

// Get all available currencies
function getAllCurrencies() {
    return Object.values(CURRENCIES);
}

module.exports = {
    CURRENCIES,
    getCurrencyByCountry,
    getCurrency,
    getAllCurrencies
};
