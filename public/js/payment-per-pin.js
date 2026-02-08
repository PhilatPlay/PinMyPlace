// Pay-Per-Pin Payment Logic (No Login Required)

let currentPinData = null;
let paymentReferenceNumber = null;
let stripe = null; // Stripe.js instance
let elements = null; // Stripe Elements instance

// Utility: Escape HTML to prevent XSS and rendering errors
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize Stripe (will be loaded from CDN)
function initializeStripe(publishableKey) {
    if (window.Stripe && !stripe) {
        // Use key from backend to ensure it always matches
        const key = publishableKey || 'pk_test_C5CV4vIyiohnxaCblQSThXmT00uOyWvAUL'; // Fallback
        stripe = Stripe(key);
        console.log('✅ Stripe initialized with key:', key.substring(0, 20) + '...');
    }
}

// Update payment amount display when currency changes
function updatePaymentAmount() {
    const currency = document.getElementById("currencySelect")?.value || 'PHP';
    const currencyInfo = getCurrencyInfo(currency);
    const amountDisplay = document.getElementById("paymentAmount");
    const button = document.getElementById("payButton");

    if (amountDisplay) {
        amountDisplay.textContent = `${currencyInfo.symbol}${currencyInfo.price.toLocaleString()}`;
    }
    if (button) {
        button.innerHTML = `💰 Pay ${currencyInfo.symbol}${currencyInfo.price.toLocaleString()} Now`;
    }
    
    // Update payment methods if function exists
    if (typeof updatePaymentMethods === 'function') {
        updatePaymentMethods(currency);
    }
    
    // Save preference when user manually changes it
    saveCurrencyPreference(currency);
}

// Proceed to payment after pin is set
function proceedToPayment() {
    if (!correctedPosition || !originalPosition) {
        showStatus("Please set your location on the map first", "error");
        return;
    }

    const locationName = document.getElementById("locationName")?.value.trim();
    const address = document.getElementById("mapAddress")?.value;

    if (!locationName) {
        showStatus("Please enter a name for this location", "error");
        return;
    }

    if (locationName.length < 3 || locationName.length > 100) {
        showStatus("Location name must be between 3 and 100 characters", "error");
        return;
    }

    // Generate payment reference number
    paymentReferenceNumber = 'PIN-' + Date.now().toString().slice(-8);

    // Collect drone data before hiding the form
    const droneData = collectDroneData();

    // Store pin data temporarily
    currentPinData = {
        locationName: locationName,
        address: address || "",
        latitude: originalPosition.lat,
        longitude: originalPosition.lng,
        correctedLatitude: correctedPosition.lat,
        correctedLongitude: correctedPosition.lng,
        referenceNumber: paymentReferenceNumber,
        droneData: droneData // Store drone data with pin data
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

    // Get currency from home selector first, then saved preference (based on user's location, not pin location)
    const homeCurrency = document.getElementById("homeCurrencySelect")?.value;
    const saved = getSavedCurrency();
    const finalCurrency = homeCurrency || saved || 'PHP';
    
    const currencySelect = document.getElementById("currencySelect");
    if (currencySelect) {
        currencySelect.value = finalCurrency;
        updatePaymentAmount();
        console.log(`💰 Currency ${homeCurrency ? 'from home selector' : saved ? 'loaded from preference' : 'defaulted to PHP'}: ${finalCurrency}`);
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

        // Add drone data if it was collected earlier
        if (currentPinData.droneData) {
            Object.assign(payload, currentPinData.droneData);
        }

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

        // DEBUG: Log the full response
        console.log('🔍 Payment initiation response:', result);
        console.log('Gateway:', result.gateway);
        console.log('Client Secret exists:', !!result.clientSecret);
        console.log('Payment Link exists:', !!result.paymentLink);

        if (result.success) {
            // Store the payment reference for later use
            sessionStorage.setItem('paymentReference', result.referenceNumber);
            sessionStorage.setItem('paymentTimestamp', Date.now().toString());

            // Check if this is a Payment Intents flow (LATAM currencies - MXN, BRL, COP, ARS)
            if (result.gateway === 'stripe-intent' && result.clientSecret) {
                console.log('✅ Stripe Intent flow detected - calling handlePaymentIntents');
                // Initialize Stripe with correct public key from backend
                if (result.stripePublicKey) {
                    initializeStripe(result.stripePublicKey);
                }
                // Clear status and show Payment Element for card payment
                showStatusInElement("paymentResult", "", "info");
                await handlePaymentIntents(result);
            } else if (result.paymentLink) {
                console.log('✅ External payment link flow');
                // Standard flow: Xendit or Stripe Checkout with external payment link
                // Clear the status message
                showStatusInElement("paymentResult", "", "info");

                // Open payment in a NEW WINDOW
                window.open(result.paymentLink, '_blank', 'width=600,height=800');

                // Show instructions
                showStatusInElement("paymentResult", 
                    `✅ Payment window opened! Complete your payment in the new window. This page will refresh when payment is confirmed.`, 
                    "success");
            } else {
                console.error('❌ Invalid response - no clientSecret or paymentLink:', result);
                showStatusInElement("paymentResult", "Invalid payment response. Please try again.", "error");
            }
        } else {
            console.error('❌ Payment initiation failed:', result.error);
            showStatusInElement("paymentResult", `Error: ${result.error || 'Failed to create payment'}`, "error");
        }
    } catch (error) {
        console.error('Payment initiation error:', error);
        showStatusInElement("paymentResult", "Connection error. Please try again.", "error");
    }
}

// Handle Payment Intents flow (LATAM currencies with local payment methods)
async function handlePaymentIntents(paymentData) {
    console.log('🔵 handlePaymentIntents called with data:', paymentData);
    
    try {
        // Initialize Stripe if not already done
        if (!stripe) {
            console.log('⚠️ Stripe not initialized, calling initializeStripe()');
            initializeStripe();
        }

        if (!stripe) {
            console.error('❌ Stripe still not loaded after initialization');
            throw new Error('Stripe not loaded. Please refresh the page.');
        }
        console.log('✅ Stripe is loaded and ready');

        // Validate clientSecret
        if (!paymentData.clientSecret) {
            console.error('❌ No clientSecret in payment data:', paymentData);
            throw new Error('Payment configuration error. Please try again.');
        }
        console.log('✅ Client secret exists:', paymentData.clientSecret.substring(0, 20) + '...');

        // Create Payment Element container if it doesn't exist
        let paymentContainer = document.getElementById('paymentElementContainer');
        if (!paymentContainer) {
            console.log('📝 Creating payment element container');
            paymentContainer = document.createElement('div');
            paymentContainer.id = 'paymentElementContainer';
            paymentContainer.style.margin = '20px 0';
            paymentContainer.innerHTML = `
                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h4 style="margin: 0 0 10px 0;">💳 Complete Your Payment</h4>
                    <p style="margin: 0; font-size: 14px;">Choose your payment method below:</p>
                </div>
                <div id="payment-element" style="min-height: 100px;"></div>
                <button id="submit-payment" style="margin-top: 20px; width: 100%;">
                    Complete Payment
                </button>
                <div id="payment-message" style="margin-top: 15px;"></div>
            `;
            
            // Insert before the existing pay button
            const payButton = document.getElementById('payButton');
            if (payButton) {
                payButton.style.display = 'none'; // Hide old pay button
                payButton.parentElement.insertBefore(paymentContainer, payButton);
                console.log('✅ Payment container inserted into DOM');
            } else {
                console.error('❌ Could not find payButton element');
            }
        } else {
            console.log('✅ Payment container already exists');
        }

        // Create Stripe Elements
        console.log('🎨 Creating Stripe Elements...');
        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#007bff',
            }
        };
        
        elements = stripe.elements({
            clientSecret: paymentData.clientSecret,
            appearance: appearance
        });
        console.log('✅ Stripe Elements created');

        // Create and mount the Payment Element
        console.log('🔧 Creating Payment Element...');
        const paymentElement = elements.create('payment');
        console.log('✅ Payment Element created, now mounting...');
        
        // Show loading indicator in the payment element container
        const paymentElementDiv = document.getElementById('payment-element');
        if (paymentElementDiv) {
            paymentElementDiv.innerHTML = '<div style="text-align: center; padding: 30px; color: #666;">Loading payment form...</div>';
        }
        
        // Mount the Payment Element (async operation)
        try {
            const mountResult = paymentElement.mount('#payment-element');
            
            // Check if mount() returns a Promise (it should, but let's be defensive)
            if (mountResult && typeof mountResult.then === 'function') {
                mountResult.then(() => {
                    console.log('✅✅✅ Payment Element mounted successfully!');
                }).catch((mountError) => {
                    console.error('❌ Payment Element mount failed:', mountError);
                    if (paymentElementDiv) {
                        paymentElementDiv.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc3545;">
                            ❌ Failed to load payment form: ${mountError.message || 'Unknown error'}<br>
                            <small>Please refresh and try again.</small>
                        </div>`;
                    }
                    throw mountError;
                });
            } else {
                // If mount() doesn't return a Promise, it mounted synchronously
                console.log('✅ Payment Element mounted (synchronous)');
            }
        } catch (mountError) {
            console.error('❌ Payment Element mount threw error:', mountError);
            if (paymentElementDiv) {
                paymentElementDiv.innerHTML = `<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px;">
                    <strong>Error loading payment form</strong><br>
                    ${mountError.message || 'Please refresh the page and try again.'}
                </div>`;
            }
            throw mountError;
        }

        // Handle form submission
        const submitButton = document.getElementById('submit-payment');
        const messageContainer = document.getElementById('payment-message');

        submitButton.addEventListener('click', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            submitButton.textContent = 'Processing...';
            messageContainer.textContent = '';

            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success.html?pi=${paymentData.paymentIntentId}&pinId=${paymentData.pinId}`,
                }
            });

            if (error) {
                // Payment failed
                messageContainer.textContent = error.message;
                messageContainer.style.color = 'red';
                submitButton.disabled = false;
                submitButton.textContent = 'Complete Payment';
            }
            // If no error, user will be redirected to return_url
        });

    } catch (error) {
        console.error('Payment Intents error:', error);
        showStatusInElement("paymentResult", `Error: ${error.message}`, "error");
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
    const mainSection = document.getElementById("mainPinSection");
    const dashboardSection = document.getElementById("userDashboard");

        // Ensure main pin section is visible
        if (mainSection) {
                mainSection.style.display = "block";
        }
        if (dashboardSection) {
                dashboardSection.style.display = "none";
        }

        // Set details
    let droneHtml = '';
    if (result.pin.droneEnabled && result.pin.droneData) {
      droneHtml = `
        <div style="background: #e8f4fd; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 12px;">
          <strong style="color: #007bff;">🚁 Drone Delivery Details:</strong><br>
          ${result.pin.droneData.landingZoneType ? `<strong>Landing Zone:</strong> ${escapeHtml(result.pin.droneData.landingZoneType)}<br>` : ''}
          ${result.pin.droneData.dropZoneDimensions && (result.pin.droneData.dropZoneDimensions.width || result.pin.droneData.dropZoneDimensions.length) ? 
            `<strong>Drop Zone:</strong> ${result.pin.droneData.dropZoneDimensions.width || '?'}m × ${result.pin.droneData.dropZoneDimensions.length || '?'}m<br>` : ''}
          ${result.pin.droneData.floorNumber ? `<strong>Floor:</strong> ${escapeHtml(result.pin.droneData.floorNumber)}<br>` : ''}
          ${result.pin.droneData.heightAboveGround ? `<strong>Height:</strong> ${result.pin.droneData.heightAboveGround}m<br>` : ''}
          ${result.pin.droneData.obstacles ? `<strong>Obstacles:</strong> ${escapeHtml(result.pin.droneData.obstacles)}<br>` : ''}
          ${result.pin.droneData.accessRestrictions ? `<strong>Access:</strong> ${escapeHtml(result.pin.droneData.accessRestrictions)}<br>` : ''}
          ${result.pin.droneData.approachDirection ? `<strong>Approach:</strong> ${escapeHtml(result.pin.droneData.approachDirection)}<br>` : ''}
          ${result.pin.droneData.notes ? `<strong>Notes:</strong> ${escapeHtml(result.pin.droneData.notes)}` : ''}
        </div>
      `;
    }

    qrDetails.innerHTML = `
    <h4>${escapeHtml(result.pin.locationName)}</h4>
    <p style="color: #666; margin: 5px 0;">${escapeHtml(result.pin.address || 'No address specified')}</p>
    <p style="font-size: 13px; color: #999;">
      Pin ID: ${result.pin.pinId}<br>
      <strong>📍 GPS Coordinates:</strong> ${result.pin.correctedLatitude.toFixed(6)}, ${result.pin.correctedLongitude.toFixed(6)}
    </p>
    ${droneHtml}
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
            title: 'My dropLogik Location',
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

    // Simply reload the page to start fresh
    window.location.href = '/';
}

// Helper function to show status in specific element
function showStatusInElement(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
}

// Initialize Stripe when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeStripe());
} else {
    initializeStripe();
}
