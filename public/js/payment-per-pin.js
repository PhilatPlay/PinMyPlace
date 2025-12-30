// Pay-Per-Pin Payment Logic (No Login Required)

let currentPinData = null;
let paymentReferenceNumber = null;

// Currency information
const CURRENCIES = {
    PHP: { symbol: '₱', price: 100, name: 'PHP 100' },
    MYR: { symbol: 'RM', price: 10, name: 'RM 10' },
    SGD: { symbol: 'S$', price: 3, name: 'S$ 3' },
    THB: { symbol: '฿', price: 70, name: '฿ 70' },
    IDR: { symbol: 'Rp', price: 32000, name: 'Rp 32,000' },
    VND: { symbol: '₫', price: 50000, name: '₫ 50,000' },
    USD: { symbol: '$', price: 2, name: '$ 2' }
};

// Update payment amount display when currency changes
function updatePaymentAmount() {
    const currency = document.getElementById("currencySelect")?.value || 'PHP';
    const currencyInfo = CURRENCIES[currency];
    const amountDisplay = document.getElementById("paymentAmount");
    const button = document.getElementById("payButton");

    if (amountDisplay) {
        amountDisplay.textContent = `${currencyInfo.symbol}${currencyInfo.price.toLocaleString()}`;
    }
    if (button) {
        button.innerHTML = `💰 Pay ${currencyInfo.name} Now`;
    }
}// Auto-detect currency based on user's coordinates
function detectCurrency(lat, lng) {
    // Rough geographic detection for SE Asia
    if (lat >= 4 && lat <= 21 && lng >= 116 && lng <= 127) return 'PHP'; // Philippines
    if (lat >= 1 && lat <= 7 && lng >= 100 && lng <= 120) return 'MYR'; // Malaysia
    if (lat >= 1.2 && lat <= 1.5 && lng >= 103.6 && lng <= 104) return 'SGD'; // Singapore
    if (lat >= 5 && lat <= 20 && lng >= 97 && lng <= 106) return 'THB'; // Thailand
    if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) return 'IDR'; // Indonesia
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) return 'VND'; // Vietnam
    return 'PHP'; // Default
}

// Proceed to payment after pin is set
function proceedToPayment() {
    if (!correctedPosition || !originalPosition) {
        showStatus("Please set your location on the map first", "error");
        return;
    }

    const locationName = document.getElementById("locationName")?.value;
    const address = document.getElementById("mapAddress")?.value;

    if (!locationName) {
        showStatus("Please enter a name for this location", "error");
        return;
    }

    // Generate payment reference number
    paymentReferenceNumber = 'PIN-' + Date.now().toString().slice(-8);

    // Store pin data temporarily
    currentPinData = {
        locationName: locationName,
        address: address || "",
        latitude: originalPosition.lat,
        longitude: originalPosition.lng,
        correctedLatitude: correctedPosition.lat,
        correctedLongitude: correctedPosition.lng,
        referenceNumber: paymentReferenceNumber
    };

    // Hide Step 1 map section and show payment section
    const mainCards = document.querySelectorAll('#mainPinSection > .card');
    mainCards.forEach(card => {
        if (!card.id || card.id !== 'paymentSection') {
            card.style.display = 'none';
        }
    });
    
    document.getElementById("paymentSection").style.display = "block";
    document.getElementById("paymentRefNumber").textContent = paymentReferenceNumber;

    // Auto-detect and set currency based on coordinates
    const detectedCurrency = detectCurrency(correctedPosition.lat, correctedPosition.lng);
    const currencySelect = document.getElementById("currencySelect");
    if (currencySelect) {
        currencySelect.value = detectedCurrency;
        updatePaymentAmount();
    }

    // Scroll to payment section
    document.getElementById("paymentSection").scrollIntoView({ behavior: 'smooth' });
}

// Proceed to payment with selected currency
async function proceedToGCashPayment() {
    const phone = document.getElementById("customerPhone")?.value.trim();
    const currency = document.getElementById("currencySelect")?.value || 'PHP';

    if (!phone) {
        showStatusInElement("paymentResult", "Please enter your mobile number", "error");
        return;
    }

    if (!currentPinData) {
        showStatusInElement("paymentResult", "Pin data missing. Please start over.", "error");
        return;
    }

    // Show loading
    showStatusInElement("paymentResult", "Creating payment link...", "info");

    try {
        const payload = {
            locationName: currentPinData.locationName,
            address: currentPinData.address,
            latitude: currentPinData.latitude,
            longitude: currentPinData.longitude,
            correctedLatitude: currentPinData.correctedLatitude,
            correctedLongitude: currentPinData.correctedLongitude,
            customerPhone: phone,
            currency: currency
        };

        // If agent is logged in, include agent ID
        if (typeof isAgent !== 'undefined' && isAgent && agentData) {
            payload.agentId = agentData._id;
        }

        const response = await fetch('/api/pin/initiate-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Store the payment reference for later use
            sessionStorage.setItem('paymentReference', result.referenceNumber);
            sessionStorage.setItem('paymentTimestamp', Date.now().toString());

            // Open PayMongo in a NEW WINDOW
            const paymentWindow = window.open(result.paymentLink, '_blank', 'width=600,height=800');

            // Show message to user with timeout warning
            const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('en-PH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            showStatusInElement("paymentResult",
                `Payment window opened! Complete payment there, then click the button below to get your QR code.<br>` +
                `<small style="color: #856404;">⏰ Payment link expires: ${expiryTime}</small>`,
                "info");

            // Add a button to check payment status
            const checkButton = document.createElement('button');
            checkButton.textContent = '📍 Get my QR Code';
            checkButton.className = 'register-btn';
            checkButton.style.marginTop = '10px';
            checkButton.onclick = function () {
                verifyPaymentStatus(result.referenceNumber);
            };
            document.getElementById("paymentResult").appendChild(checkButton);
        } else {
            showStatusInElement("paymentResult", `Error: ${result.error || 'Failed to create payment'}`, "error");
        }
    } catch (error) {
        console.error('Payment initiation error:', error);
        showStatusInElement("paymentResult", "Connection error. Please try again.", "error");
    }
}

// Verify payment status and show QR code
async function verifyPaymentStatus(refId) {
    try {
        showStatusInElement("paymentResult", "Verifying payment...", "info");

        const agentData = localStorage.getItem('agentData');
        const agentId = agentData ? JSON.parse(agentData)._id : null;

        const response = await fetch('/api/pin/create-with-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentReferenceId: refId,
                agentId: agentId
            })
        });

        const result = await response.json();

        if (result.success) {
            // Clear sessionStorage
            sessionStorage.removeItem('paymentReference');

            // Hide payment section and show QR section
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('qrSection').style.display = 'block';

            // Display the QR code
            displayQRCode(result);

            // Scroll to QR section
            document.getElementById('qrSection').scrollIntoView({ behavior: 'smooth' });
        } else {
            showStatusInElement("paymentResult", `Payment not yet confirmed: ${result.error || 'Please try again'}`, "error");
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        showStatusInElement("paymentResult", "Connection error. Please try again.", "error");
    }
}

// Submit payment and get QR code (legacy - keeping for backward compatibility)
async function submitPaymentAndGetQR() {
    const gcashRef = document.getElementById("gcashReference")?.value.trim();
    const phone = document.getElementById("customerPhone")?.value.trim();

    if (!gcashRef) {
        showStatusInElement("paymentResult", "Please enter your GCash reference number", "error");
        return;
    }

    if (gcashRef.length < 10) {
        showStatusInElement("paymentResult", "Please enter a valid GCash reference number", "error");
        return;
    }

    if (!phone) {
        showStatusInElement("paymentResult", "Please enter your mobile number", "error");
        return;
    }

    if (!currentPinData) {
        showStatusInElement("paymentResult", "Pin data missing. Please start over.", "error");
        return;
    }

    // Show loading
    showStatusInElement("paymentResult", "Verifying payment and generating your QR code...", "info");

    try {
        const payload = {
            gcashReference: gcashRef,
            referenceNumber: currentPinData.referenceNumber,
            locationName: currentPinData.locationName,
            address: currentPinData.address,
            latitude: currentPinData.latitude,
            longitude: currentPinData.longitude,
            correctedLatitude: currentPinData.correctedLatitude,
            correctedLongitude: currentPinData.correctedLongitude,
            customerPhone: phone,
            amount: 50
        };

        // If agent is logged in, include agent ID
        if (typeof isAgent !== 'undefined' && isAgent && agentData) {
            payload.agentId = agentData._id;
        }

        const response = await fetch('/api/pin/create-with-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Hide payment section
            document.getElementById("paymentSection").style.display = "none";

            // Show QR section with the result
            displayQRCode(result);
        } else {
            showStatusInElement("paymentResult", `Error: ${result.error || 'Payment verification failed'}`, "error");
        }
    } catch (error) {
        console.error('Payment submission error:', error);
        showStatusInElement("paymentResult", "Connection error. Please try again.", "error");
    }
}

// Display QR code after successful payment
function displayQRCode(result) {
    const qrSection = document.getElementById("qrSection");
    const qrDetails = document.getElementById("qrDetails");
    const shareLink = document.getElementById("shareLink");

    // Set details
    qrDetails.innerHTML = `
    <h4>${result.pin.locationName}</h4>
    <p style="color: #666; margin: 5px 0;">${result.pin.address || 'No address specified'}</p>
    <p style="font-size: 13px; color: #999;">
      Pin ID: ${result.pin.pinId}<br>
      <strong>📍 GPS Coordinates:</strong> ${result.pin.correctedLatitude.toFixed(6)}, ${result.pin.correctedLongitude.toFixed(6)}
    </p>
  `;

    // Generate QR code with link to location
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.pin.correctedLatitude},${result.pin.correctedLongitude}`;
    generateQRCode(mapUrl);

    // Set share link
    const pinUrl = `${window.location.origin}/pin/${result.pin.pinId}`;
    shareLink.value = pinUrl;

    // Show QR section
    qrSection.style.display = "block";
    qrSection.scrollIntoView({ behavior: 'smooth' });

    // Clear current pin data
    currentPinData = null;
}

// Copy share link to clipboard
function copyShareLink() {
    const shareLink = document.getElementById("shareLink");
    shareLink.select();
    document.execCommand('copy');
    showStatus("Link copied to clipboard!", "success");
}

// Share QR via messenger/social media
function shareQR() {
    const shareLink = document.getElementById("shareLink").value;
    const text = `📍 My delivery location pin: ${shareLink}`;

    if (navigator.share) {
        navigator.share({
            title: 'My PinMyPlace Location',
            text: text,
            url: shareLink
        }).catch(err => console.log('Share cancelled'));
    } else {
        // Fallback - copy to clipboard
        copyShareLink();
        showStatus("Link copied! Share it manually on Messenger or SMS", "success");
    }
}

// Create another pin
function createAnotherPin() {
    // If agent is logged in, return to dashboard
    if (typeof isAgent !== 'undefined' && isAgent) {
        returnToAgentDashboard();
        return;
    }

    // Reset form
    document.getElementById("locationName").value = "";
    document.getElementById("mapAddress").value = "";
    document.getElementById("paymentProof").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("proofPreview").style.display = "none";

    // Hide sections
    document.getElementById("paymentSection").style.display = "none";
    document.getElementById("qrSection").style.display = "none";
    document.getElementById("addressSection").style.display = "none";
    document.getElementById("mapControls").style.display = "none";

    // Clear map
    if (map) {
        map.remove();
        map = null;
    }
    originalPosition = null;
    correctedPosition = null;
    currentPinData = null;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Helper function to show status in specific element
function showStatusInElement(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
}
