// Payment Processing for dropLogik Premium

// Initiate payment for premium subscription
async function initiatePayment(plan) {
    try {
        showStatus("Initiating payment...", "info");

        const response = await fetch(`${API_BASE}/payment/create-checkout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            body: JSON.stringify({
                plan: plan, // 'monthly' or 'yearly'
                userId: currentUser?._id || currentUser?.email,
            }),
        });

        const result = await response.json();

        if (result.success) {
            // Redirect to payment provider or show payment modal
            if (result.paymentUrl) {
                window.location.href = result.paymentUrl;
            } else if (result.paymentId) {
                // Show payment modal for local processing
                showPaymentModal(result);
            }
        } else {
            showStatus(`Payment failed: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, "error");
    }
}

// Verify payment status
async function verifyPayment(paymentId) {
    try {
        const response = await fetch(`${API_BASE}/payment/verify/${paymentId}`, {
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (result.success && result.payment.status === 'completed') {
            showStatus("Payment verified successfully! ✅", "success");

            // Update user's premium status
            if (currentUser) {
                currentUser.isPremium = true;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }

            // Reload or update UI
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showStatus("Payment verification pending...", "info");
        }
    } catch (error) {
        showStatus(`Error verifying payment: ${error.message}`, "error");
    }
}

// Show payment modal (for GCash, PayMaya, etc.)
function showPaymentModal(paymentData) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
    <div class="modal-content card" style="max-width: 500px; margin: 50px auto; position: relative;">
      <button onclick="closePaymentModal()" style="position: absolute; top: 10px; right: 10px; width: auto; padding: 5px 10px;">✕</button>
      
      <h3>💳 Complete Payment</h3>
      <p>Plan: ${paymentData.plan === 'monthly' ? 'Monthly Premium (₱29)' : 'Yearly Premium (₱299)'}</p>
      
      <div class="payment-methods" style="margin: 20px 0;">
        <h4>Choose Payment Method:</h4>
        <button onclick="payWithGCash('${paymentData.paymentId}')" class="upgrade-btn">
          📱 Pay with GCash
        </button>
        <button onclick="payWithPayMaya('${paymentData.paymentId}')" class="upgrade-btn">
          💳 Pay with PayMaya
        </button>
        <button onclick="payWithCard('${paymentData.paymentId}')" class="upgrade-btn">
          💰 Pay with Card
        </button>
      </div>
      
      <div id="paymentInstructions" class="status info" style="display: none;">
        <p>Payment instructions will appear here...</p>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

function closePaymentModal() {
    const modal = document.querySelector('.payment-modal');
    if (modal) {
        modal.remove();
    }
}

// Payment method handlers (to be implemented with actual payment gateways)
async function payWithGCash(paymentId) {
    const instructions = document.getElementById('paymentInstructions');
    instructions.style.display = 'block';
    instructions.innerHTML = `
    <h4>GCash Payment Instructions:</h4>
    <ol>
      <li>Open your GCash app</li>
      <li>Send payment to: <strong>09XX-XXX-XXXX</strong></li>
      <li>Reference: <strong>${paymentId}</strong></li>
      <li>Upload screenshot of payment below</li>
    </ol>
    <input type="file" id="paymentProof" accept="image/*" style="margin: 10px 0;">
    <button onclick="submitPaymentProof('${paymentId}', 'gcash')" class="upgrade-btn">
      Submit Payment Proof
    </button>
  `;
}

async function payWithPayMaya(paymentId) {
    const instructions = document.getElementById('paymentInstructions');
    instructions.style.display = 'block';
    instructions.innerHTML = `
    <h4>PayMaya Payment Instructions:</h4>
    <ol>
      <li>Open your PayMaya app</li>
      <li>Send payment to: <strong>09XX-XXX-XXXX</strong></li>
      <li>Reference: <strong>${paymentId}</strong></li>
      <li>Upload screenshot of payment below</li>
    </ol>
    <input type="file" id="paymentProof" accept="image/*" style="margin: 10px 0;">
    <button onclick="submitPaymentProof('${paymentId}', 'paymaya')" class="upgrade-btn">
      Submit Payment Proof
    </button>
  `;
}

async function payWithCard(paymentId) {
    showStatus("Card payment integration coming soon!", "info");
}

// Submit payment proof
async function submitPaymentProof(paymentId, method) {
    const fileInput = document.getElementById('paymentProof');
    const file = fileInput?.files[0];

    if (!file) {
        showStatus("Please upload payment proof", "error");
        return;
    }

    const formData = new FormData();
    formData.append('paymentProof', file);
    formData.append('paymentId', paymentId);
    formData.append('method', method);

    try {
        const response = await fetch(`${API_BASE}/payment/submit-proof`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            closePaymentModal();
            showStatus("Payment proof submitted! We'll verify and activate your premium account within 24 hours.", "success");
        } else {
            showStatus(`Error: ${result.error}`, "error");
        }
    } catch (error) {
        showStatus(`Error submitting proof: ${error.message}`, "error");
    }
}

// Check if user is premium
function isPremiumUser() {
    return currentUser && currentUser.isPremium === true;
}

// Show upgrade prompt for free users
function checkPremiumAccess(feature) {
    if (!isPremiumUser()) {
        showUpgradePrompt(feature);
        return false;
    }
    return true;
}

function showUpgradePrompt(feature) {
    const prompt = `
    <div class="status warning">
      <strong>🌟 Premium Feature</strong><br>
      ${feature} is available for Premium users only.<br>
      <button onclick="showPricingSection()" class="upgrade-btn" style="margin-top: 10px;">
        Upgrade to Premium
      </button>
    </div>
  `;

    const resultDiv = document.getElementById("mapResult") || document.getElementById("lookupResult");
    if (resultDiv) {
        resultDiv.innerHTML = prompt;
    }
}

function showPricingSection() {
    // Scroll to pricing or show pricing modal
    const pricingSection = document.getElementById("pricingSection");
    if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
}
