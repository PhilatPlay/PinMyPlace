// Utility Functions

// Currency definitions (matches server-side config)
const CURRENCIES = {
    PHP: { code: 'PHP', symbol: '₱', price: 150, name: 'Philippine Peso', country: 'Philippines', flag: '🇵🇭' },
    MYR: { code: 'MYR', symbol: 'RM', price: 15, name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾' },
    SGD: { code: 'SGD', symbol: 'S$', price: 4.5, name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬' },
    THB: { code: 'THB', symbol: '฿', price: 105, name: 'Thai Baht', country: 'Thailand', flag: '🇹🇭' },
    IDR: { code: 'IDR', symbol: 'Rp', price: 48000, name: 'Indonesian Rupiah', country: 'Indonesia', flag: '🇮🇩' },
    VND: { code: 'VND', symbol: '₫', price: 75000, name: 'Vietnamese Dong', country: 'Vietnam', flag: '🇻🇳' },
    USD: { code: 'USD', symbol: '$', price: 3, name: 'US Dollar', country: 'International', flag: '🌏' },
    HKD: { code: 'HKD', symbol: 'HK$', price: 24, name: 'Hong Kong Dollar', country: 'Hong Kong', flag: '🇭🇰' }
};

// Get saved currency preference
function getSavedCurrency() {
    const saved = localStorage.getItem('preferredCurrency');
    return saved && CURRENCIES[saved] ? saved : null;
}

// Save currency preference
function saveCurrencyPreference(currencyCode) {
    if (CURRENCIES[currencyCode]) {
        localStorage.setItem('preferredCurrency', currencyCode);
        console.log(`💾 Saved currency preference: ${currencyCode}`);
    }
}

// Auto-detect currency from browser locale (fallback)
function detectCurrencyFromLocale() {
    try {
        const locale = navigator.language || navigator.userLanguage;
        const countryCode = locale.split('-')[1]?.toUpperCase();
        
        const countryToCurrency = {
            'PH': 'PHP', 'MY': 'MYR', 'SG': 'SGD', 'TH': 'THB',
            'ID': 'IDR', 'VN': 'VND', 'HK': 'HKD', 'US': 'USD'
        };
        
        return countryToCurrency[countryCode] || 'PHP';
    } catch (error) {
        return 'PHP';
    }
}

// Auto-detect currency based on coordinates (for main page with map)
function detectCurrencyFromCoordinates(lat, lng) {
    if (lat >= 4 && lat <= 21 && lng >= 116 && lng <= 127) return 'PHP'; // Philippines
    if (lat >= 1 && lat <= 7 && lng >= 100 && lng <= 120) return 'MYR'; // Malaysia
    if (lat >= 1.2 && lat <= 1.5 && lng >= 103.6 && lng <= 104) return 'SGD'; // Singapore
    if (lat >= 5 && lat <= 20 && lng >= 97 && lng <= 106) return 'THB'; // Thailand
    if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) return 'IDR'; // Indonesia
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) return 'VND'; // Vietnam
    if (lat >= 22 && lat <= 23 && lng >= 113 && lng <= 115) return 'HKD'; // Hong Kong
    return 'PHP'; // Default
}

// Get currency info by code
function getCurrencyInfo(code) {
    return CURRENCIES[code] || CURRENCIES.PHP;
}

// Detect user's currency based on location
async function detectUserCurrency() {
    try {
        // Check for currency override in URL (for testing)
        const urlParams = new URLSearchParams(window.location.search);
        const override = urlParams.get('currency') || urlParams.get('override');

        const apiUrl = override
            ? `/api/currency/detect?override=${override}`
            : '/api/currency/detect';

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.success && result.currency) {
            const currency = result.currency;
            const formattedPrice = `${currency.symbol}${currency.price.toLocaleString()}`;
            const commission = Math.floor(currency.price / 2);
            const formattedCommission = `${currency.symbol}${commission.toLocaleString()}`;

            // Update header price
            const headerPrice = document.getElementById('headerPrice');
            if (headerPrice) {
                headerPrice.textContent = `Gigital Addressing for Reliable Delivery -- create a scannable location for areas without formal addresses`;
            }

            // Update all dynamic price elements
            const priceElements = document.querySelectorAll('.dynamic-price');
            priceElements.forEach(el => {
                el.textContent = formattedPrice;
            });

            // Update all dynamic commission elements (50% of price)
            const commissionElements = document.querySelectorAll('.dynamic-commission');
            commissionElements.forEach(el => {
                el.textContent = formattedCommission;
            });

            // Update payment amount display
            const paymentAmount = document.getElementById('paymentAmount');
            if (paymentAmount) {
                paymentAmount.textContent = formattedPrice;
            }

            // Update pay button text
            const payButton = document.getElementById('payButton');
            if (payButton) {
                payButton.innerHTML = `💰 Pay ${formattedPrice} Now`;
            }

            // Set currency selector if exists
            const currencySelect = document.getElementById('currencySelect');
            if (currencySelect) {
                currencySelect.value = currency.code;
                // Trigger update if payment section is visible
                if (typeof updatePaymentAmount === 'function') {
                    updatePaymentAmount();
                }
            }

            console.log(`✅ Currency detected: ${currency.code} (${currency.country})${override ? ' [OVERRIDE]' : ''}`);
            return currency;
        }
    } catch (error) {
        console.error('Currency detection failed:', error);
    }

    // Default to PHP if detection fails
    return { code: 'PHP', symbol: '₱', price: 150 };
}

// Show status message
function showStatus(message, type = "info") {
    // Try to find a status element, or create one
    let statusElement = document.getElementById("statusMessage");

    if (!statusElement) {
        // Create status element if it doesn't exist
        statusElement = document.createElement("div");
        statusElement.id = "statusMessage";
        statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 90%;
            width: 480px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        `;
        document.body.appendChild(statusElement);
    }

    // Set colors based on type
    const colors = {
        success: { bg: "#d4edda", text: "#155724", border: "#c3e6cb" },
        error: { bg: "#f8d7da", text: "#721c24", border: "#f5c6cb" },
        info: { bg: "#d1ecf1", text: "#0c5460", border: "#bee5eb" },
        warning: { bg: "#fff3cd", text: "#856404", border: "#ffeaa7" }
    };

    const color = colors[type] || colors.info;
    statusElement.style.backgroundColor = color.bg;
    statusElement.style.color = color.text;
    statusElement.style.border = `1px solid ${color.border}`;
    statusElement.textContent = message;
    statusElement.style.display = "block";

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = "none";
    }, 5000);
}

// Generate QR Code
function generateQRCode(data) {
    const qrElement = document.getElementById("qrCodeCanvas");

    if (!qrElement) {
        console.error("QR Code element not found");
        return;
    }

    try {
        // Clear any existing QR code
        qrElement.innerHTML = "";

        // Calculate responsive QR code size
        const screenWidth = window.innerWidth;
        let qrSize = 200; // Default size

        if (screenWidth < 480) {
            qrSize = Math.min(180, screenWidth - 80); // Small phones
        } else if (screenWidth < 768) {
            qrSize = 200; // Tablets
        }

        // Generate new QR code with responsive sizing
        new QRCode(qrElement, {
            text: data,
            width: qrSize,
            height: qrSize,
            colorDark: "#000000",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.H,
        });
        console.log("QR code generated successfully");
    } catch (error) {
        console.error("QR code generation failed:", error);
        // Fallback to text
        qrElement.style.display = "none";
        const fallbackDiv = document.createElement("div");
        fallbackDiv.innerHTML = `
      <div class="status warning">
        <strong>📱 Map Link:</strong><br>
        <small style="word-break: break-all; font-family: monospace;">${data}</small><br>
        <small>💡 Copy this link and use any online QR generator to create your delivery QR code!</small>
      </div>
    `;
        qrElement.parentNode.appendChild(fallbackDiv);
    }
}

// Download QR code function
async function downloadQR() {
    const qrElement = document.getElementById("qrCodeCanvas");
    try {
        const canvas = await html2canvas(qrElement);
        const link = document.createElement("a");
        link.download = "pinmyplace-qr-code.png";
        link.href = canvas.toDataURL();
        link.click();
    } catch (error) {
        console.error("Failed to download QR code:", error);
        alert("Failed to download QR code. Please try again.");
    }
}

// Format date/time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showStatus("Copied to clipboard!", "success");
    }).catch(err => {
        console.error("Failed to copy:", err);
        showStatus("Failed to copy to clipboard", "error");
    });
}

// Initialize app on page load
window.onload = async function () {
    console.log("PinMyPlace initialized - Pay Per Pin Mode");

    // Detect and set user's currency
    await detectUserCurrency();

    // Check which libraries loaded
    if (typeof QRCode !== "undefined") {
        console.log("✅ QRCode library loaded successfully");
    } else {
        console.warn("⚠️ QRCode library not loaded. QR codes will show as text.");
    }

    if (typeof L !== "undefined") {
        console.log("✅ Leaflet library loaded successfully");
    } else {
        console.warn("⚠️ Leaflet library not loaded. Maps will not work.");
    }

    if (typeof html2canvas !== "undefined") {
        console.log("✅ html2canvas library loaded successfully");
    } else {
        console.warn("⚠️ html2canvas library not loaded. QR download will not work.");
    }

    // Check for payment callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('paymentId');
    const status = urlParams.get('status');

    if (paymentId && status === 'success') {
        verifyPayment(paymentId);
    }
};
