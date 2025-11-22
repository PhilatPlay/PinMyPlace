// Currency configuration for Southeast Asia
// Prices are equivalent to ~$2 USD base price

const CURRENCIES = {
    PHP: {
        code: 'PHP',
        symbol: '₱',
        name: 'Philippine Peso',
        price: 100,
        country: 'Philippines',
        flag: '🇵🇭'
    },
    MYR: {
        code: 'MYR',
        symbol: 'RM',
        name: 'Malaysian Ringgit',
        price: 10,
        country: 'Malaysia',
        flag: '🇲🇾'
    },
    SGD: {
        code: 'SGD',
        symbol: 'S$',
        name: 'Singapore Dollar',
        price: 3,
        country: 'Singapore',
        flag: '🇸🇬'
    },
    THB: {
        code: 'THB',
        symbol: '฿',
        name: 'Thai Baht',
        price: 70,
        country: 'Thailand',
        flag: '🇹🇭'
    },
    IDR: {
        code: 'IDR',
        symbol: 'Rp',
        name: 'Indonesian Rupiah',
        price: 32000,
        country: 'Indonesia',
        flag: '🇮🇩'
    },
    VND: {
        code: 'VND',
        symbol: '₫',
        name: 'Vietnamese Dong',
        price: 50000,
        country: 'Vietnam',
        flag: '🇻🇳'
    },
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        price: 2,
        country: 'International',
        flag: '🌏'
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
