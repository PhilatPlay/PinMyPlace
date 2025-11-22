// Utility Functions

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
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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
window.onload = function () {
    console.log("PinMyPlace initialized");

    // Check for existing session
    checkExistingSession();

    // Set default value for map user ID
    const mapUserIdElement = document.getElementById("mapUserId");
    if (mapUserIdElement && currentUser) {
        mapUserIdElement.value = currentUser.email || "user_" + Date.now();
    } else if (mapUserIdElement) {
        mapUserIdElement.value = "user_" + Date.now();
    }

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
