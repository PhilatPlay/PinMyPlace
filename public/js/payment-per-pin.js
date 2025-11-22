// Pay-Per-Pin Payment Logic (No Login Required)

let currentPinData = null;
let paymentReferenceNumber = null;

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

    // Show payment section
    document.getElementById("paymentSection").style.display = "block";
    document.getElementById("paymentRefNumber").textContent = paymentReferenceNumber;

    // Scroll to payment section
    document.getElementById("paymentSection").scrollIntoView({ behavior: 'smooth' });
}

// Submit payment and get QR code
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

    // Format expiration date
    const expiryDate = new Date(result.pin.expiresAt);
    const formattedExpiry = expiryDate.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Set details
    qrDetails.innerHTML = `
    <h4>${result.pin.locationName}</h4>
    <p style="color: #666; margin: 5px 0;">${result.pin.address || 'No address specified'}</p>
    <p style="font-size: 13px; color: #999;">
      Pin ID: ${result.pin.pinId}<br>
      Valid until: ${formattedExpiry}<br>
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
