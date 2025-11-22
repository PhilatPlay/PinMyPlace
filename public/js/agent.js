// Agent/Reseller System

let isAgent = false;
let agentData = null;

// Show agent login modal
function showAgentLogin() {
    document.getElementById("agentLoginModal").style.display = "block";
}

// Close agent login modal
function closeAgentLogin() {
    document.getElementById("agentLoginModal").style.display = "none";
}

// Agent login
async function agentLogin() {
    const email = document.getElementById("agentEmail").value;
    const password = document.getElementById("agentPassword").value;
    const statusDiv = document.getElementById("agentAuthStatus");

    if (!email || !password) {
        statusDiv.innerHTML = '<div class="status error">Please enter email and password</div>';
        return;
    }

    try {
        statusDiv.innerHTML = '<div class="status info">Logging in...</div>';

        const response = await fetch("/api/agent/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            agentData = result.agent;
            isAgent = true;

            // Store in localStorage
            localStorage.setItem('agentToken', result.token);
            localStorage.setItem('agentData', JSON.stringify(agentData));

            // Hide modal and main section
            closeAgentLogin();
            document.getElementById("mainPinSection").style.display = "none";
            document.getElementById("agentDashboard").style.display = "block";

            // Load agent dashboard data
            loadAgentDashboard();
        } else {
            statusDiv.innerHTML = `<div class="status error">❌ Login failed: ${result.error || "Invalid credentials"}</div>`;
        }
    } catch (error) {
        console.error("Agent login error:", error);
        statusDiv.innerHTML = '<div class="status error">❌ Connection error. Please try again.</div>';
    }
}

// Agent logout
function agentLogout() {
    isAgent = false;
    agentData = null;
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agentData');

    document.getElementById("agentDashboard").style.display = "none";
    document.getElementById("mainPinSection").style.display = "block";
}

// Load agent dashboard
async function loadAgentDashboard() {
    if (!agentData) return;

    // Set agent name
    document.getElementById("agentName").textContent = agentData.name || agentData.email;

    // Load sales stats
    try {
        const token = localStorage.getItem('agentToken');
        const response = await fetch("/api/agent/stats", {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById("todaySales").textContent = result.today.count;
            document.getElementById("todayEarnings").textContent = result.today.earnings;
            document.getElementById("monthSales").textContent = result.month.count;
            document.getElementById("monthEarnings").textContent = result.month.earnings;
            document.getElementById("pendingCommission").textContent = result.total.pending;

            // Load sales history
            loadSalesHistory(result.recentSales);
        }
    } catch (error) {
        console.error('Error loading agent stats:', error);
    }
}

// Load sales history table
function loadSalesHistory(sales) {
    const historyDiv = document.getElementById("agentSalesHistory");

    if (!sales || sales.length === 0) {
        historyDiv.innerHTML = '<p style="color: #666;">No sales yet. Start selling pins!</p>';
        return;
    }

    let html = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f8f9fa; text-align: left;">
          <th style="padding: 10px; border-bottom: 2px solid #ddd;">Date</th>
          <th style="padding: 10px; border-bottom: 2px solid #ddd;">Customer</th>
          <th style="padding: 10px; border-bottom: 2px solid #ddd;">Pin ID</th>
          <th style="padding: 10px; border-bottom: 2px solid #ddd;">Earnings</th>
        </tr>
      </thead>
      <tbody>
  `;

    sales.forEach(sale => {
        const date = new Date(sale.createdAt).toLocaleDateString('en-PH');
        html += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${date}</td>
        <td style="padding: 10px;">${sale.locationName}</td>
        <td style="padding: 10px; font-family: monospace; font-size: 12px;">${sale.pinId}</td>
        <td style="padding: 10px; color: #28a745; font-weight: bold;">₱25</td>
      </tr>
    `;
    });

    html += `
      </tbody>
    </table>
  `;

    historyDiv.innerHTML = html;
}

// Show agent signup
function showAgentSignup() {
    // Navigate to agent signup page or show signup form
    alert("Agent signup coming soon! Contact us at 09XX-XXX-XXXX to become an agent.");
}

// Check for existing agent session on page load
function checkAgentSession() {
    const savedToken = localStorage.getItem('agentToken');
    const savedData = localStorage.getItem('agentData');

    if (savedToken && savedData) {
        agentData = JSON.parse(savedData);
        isAgent = true;

        document.getElementById("mainPinSection").style.display = "none";
        document.getElementById("agentDashboard").style.display = "block";

        loadAgentDashboard();
    }
}

// Auto-check on page load
window.addEventListener('load', checkAgentSession);

// Request payout
async function requestPayout() {
    const pendingAmount = parseFloat(document.getElementById("pendingCommission").textContent);

    if (pendingAmount < 100) {
        alert("⚠️ Minimum payout is ₱100. Continue selling pins to reach the minimum!");
        return;
    }

    if (!confirm(`Request payout of ₱${pendingAmount}?\n\nYou will receive payment within 1-2 business days via your registered payout method.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('agentToken');
        const response = await fetch("/api/agent/request-payout", {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ ${result.message}`);
            loadAgentDashboard(); // Refresh stats
        } else {
            alert(`❌ ${result.error || 'Failed to request payout'}`);
        }
    } catch (error) {
        console.error('Payout request error:', error);
        alert('❌ Connection error. Please try again.');
    }
}

// Start creating pin for customer (agent mode)
function startAgentPinCreation() {
    // Hide agent dashboard, show main pin section
    document.getElementById("agentDashboard").style.display = "none";
    document.getElementById("mainPinSection").style.display = "block";

    // Initialize the map
    initializeMap();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Return to agent dashboard
function returnToAgentDashboard() {
    if (isAgent) {
        document.getElementById("mainPinSection").style.display = "none";
        document.getElementById("agentDashboard").style.display = "block";
        loadAgentDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
