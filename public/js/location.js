// API Base URL
const API_BASE = window.location.origin;

// Register the corrected location
async function registerCorrectedLocation() {
    if (!correctedPosition || !originalPosition) {
        showStatus("Please initialize the map first", "error");
        return;
    }

    const userId = document.getElementById("mapUserId").value;
    const userAddress = document.getElementById("mapAddress").value;

    if (!userId) {
        showStatus("Please enter a user ID", "error");
        return;
    }

    // Create address with user input + correction info
    const correctionDistance = calculateDistance(
        originalPosition.lat,
        originalPosition.lng,
        correctedPosition.lat,
        correctedPosition.lng
    );

    let finalAddress = userAddress || "GPS Location";
    if (correctionDistance > 1) {
        finalAddress += ` (${correctionDistance.toFixed(1)}m correction applied)`;
    }

    try {
        const response = await fetch(`${API_BASE}/gps/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            body: JSON.stringify({
                userId: userId,
                latitude: originalPosition.lat,
                longitude: originalPosition.lng,
                correctedLatitude: correctedPosition.lat,
                correctedLongitude: correctedPosition.lng,
                address: finalAddress,
            }),
        });

        const result = await response.json();

        if (result.success) {
            const correctionDistance = calculateDistance(
                originalPosition.lat,
                originalPosition.lng,
                correctedPosition.lat,
                correctedPosition.lng
            );

            // Create QR code data with Google Maps directions URL
            const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${correctedPosition.lat},${correctedPosition.lng}`;
            const qrData = mapUrl;

            document.getElementById("mapResult").innerHTML = `
        <div class="status success">
          <strong>✅ Location Registered Successfully!</strong><br><br>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0;">
            <strong>📍 Location Details:</strong><br>
            <small>Location ID: ${result.locationId}</small><br>
            <small>Correction: ${correctionDistance.toFixed(1)} meters from GPS</small><br>
            <small>QR Code: ${result.qrCode}</small>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <strong>📱 Delivery QR Code:</strong><br>
            <small style="color: #666;">Scan to open Google Maps with driving directions to this location</small><br>
            <div id="qrCodeCanvas" style="margin: 10px auto; border: 2px solid #ddd; border-radius: 8px; display: inline-block; max-width: 100%; overflow: hidden;"></div><br>
            <button onclick="downloadQR()" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">
              📥 Download QR Code
            </button>
          </div>
        </div>
      `;

            // Generate and display QR code
            generateQRCode(qrData);
        } else {
            showStatus(`Registration failed: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    }
}

// Get location by ID (Admin)
async function getLocation() {
    const locationId = document.getElementById("locationId").value;

    if (!locationId) {
        showStatus("Please enter a location ID", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/gps/location/${locationId}`, {
            headers: getAuthHeaders(),
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById("lookupResult").innerHTML = `
        <div class="result">${JSON.stringify(result.location, null, 2)}</div>
      `;
        } else {
            showStatus("Location not found", "error");
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    }
}

// Get user's locations (Admin)
async function getUserLocations() {
    const userId = document.getElementById("lookupUserId").value;

    if (!userId) {
        showStatus("Please enter a user ID", "error");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/gps/user/${userId}/locations`, {
            headers: getAuthHeaders(),
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById("lookupResult").innerHTML = `
        <div class="result">
User: ${result.userId}
Total Locations: ${result.totalLocations}

Locations:
${JSON.stringify(result.locations, null, 2)}
        </div>
      `;
        } else {
            showStatus("No locations found for user", "error");
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    }
}

// Show status message
function showStatus(message, type) {
    const statusDiv = document.createElement("div");
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;

    // Find the result container
    const resultContainer = document.getElementById("mapResult") ||
        document.getElementById("lookupResult");

    if (resultContainer) {
        // Remove existing status messages
        const existingStatus = resultContainer.querySelector(".status");
        if (existingStatus) {
            existingStatus.remove();
        }

        resultContainer.appendChild(statusDiv);
    }
}
