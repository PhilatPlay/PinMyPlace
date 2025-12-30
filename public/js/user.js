// User Login System

let isLoggedIn = false;
let userData = null;

// Show login modal
function showLogin() {
    document.getElementById("loginModal").style.display = "block";
}

// Close login modal
function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
}

// User login
async function userLogin() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const statusDiv = document.getElementById("loginAuthStatus");

    if (!email || !password) {
        statusDiv.innerHTML = '<div class="status error">Please enter email and password</div>';
        return;
    }

    try {
        statusDiv.innerHTML = '<div class="status info">Logging in...</div>';

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            userData = result.user;
            isLoggedIn = true;

            console.log('=== LOGIN SUCCESSFUL ===');
            console.log('User data:', userData);

            // Store in localStorage
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(userData));

            // Clear the form fields BEFORE hiding modal
            document.getElementById("loginEmail").value = '';
            document.getElementById("loginPassword").value = '';
            statusDiv.innerHTML = '';

            // Hide modal and main section
            closeLogin();
            
            const mainSection = document.getElementById("mainPinSection");
            const dashboardSection = document.getElementById("userDashboard");
            
            console.log('Main section element:', mainSection);
            console.log('Dashboard element:', dashboardSection);
            
            if (mainSection) {
                mainSection.style.display = "none";
                console.log('✅ Main section hidden');
            }
            
            if (dashboardSection) {
                dashboardSection.style.display = "block";
                console.log('✅ Dashboard displayed');
                console.log('Dashboard visibility:', window.getComputedStyle(dashboardSection).display);
            }

            // Update the auth link in header
            if (typeof updateAuthLink === 'function') {
                updateAuthLink(true);
            }

            // Load user dashboard data
            loadUserDashboard();
        } else {
            statusDiv.innerHTML = `<div class="status error">❌ Login failed: ${result.error || "Invalid credentials"}</div>`;
        }
    } catch (error) {
        console.error("Agent login error:", error);
        statusDiv.innerHTML = '<div class="status error">❌ Connection error. Please try again.</div>';
    }
}

// User logout
function userLogout() {
    isLoggedIn = false;
    userData = null;
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');

    document.getElementById("userDashboard").style.display = "none";
    document.getElementById("mainPinSection").style.display = "block";
    
    // Update the auth link in header
    if (typeof updateAuthLink === 'function') {
        updateAuthLink(false);
    }

    // Reinitialize the map since it may not have been loaded
    if (typeof initializeMap === 'function') {
        setTimeout(() => {
            initializeMap();
        }, 100);
    }
}

// Load user dashboard
async function loadUserDashboard() {
    if (!userData) return;

    // Set user name in header and welcome message
    document.getElementById("userName").textContent = userData.name || userData.email;
    const displayName = (userData.name || userData.email).split(' ')[0]; // First name only
    document.getElementById("userNameDisplay").textContent = displayName;
}

// Show agent signup
function showAgentSignup() {
    showSignupForm();
}

// Show login form (tab switch)
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginTab').style.background = '#007bff';
    document.getElementById('loginTab').style.color = 'white';
    document.getElementById('loginTab').style.borderBottom = '3px solid #007bff';
    document.getElementById('signupTab').style.background = 'white';
    document.getElementById('signupTab').style.color = '#333';
    document.getElementById('signupTab').style.borderBottom = '3px solid transparent';
}

// Show signup form (tab switch)
function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('signupTab').style.background = '#007bff';
    document.getElementById('signupTab').style.color = 'white';
    document.getElementById('signupTab').style.borderBottom = '3px solid #007bff';
    document.getElementById('loginTab').style.background = 'white';
    document.getElementById('loginTab').style.color = '#333';
    document.getElementById('loginTab').style.borderBottom = '3px solid transparent';
}

// User signup (for bulk buyers)
async function userSignup() {
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const phone = document.getElementById('signupPhone')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const statusDiv = document.getElementById('signupAuthStatus');

    if (!name || !email || !phone || !password) {
        statusDiv.innerHTML = '<div class="status error">All fields are required</div>';
        return;
    }

    if (password.length < 6) {
        statusDiv.innerHTML = '<div class="status error">Password must be at least 6 characters</div>';
        return;
    }

    try {
        statusDiv.innerHTML = '<div class="status info">Creating account...</div>';

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, email, phone, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Store token and data
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));

            statusDiv.innerHTML = '<div class="status success">✅ Account created! Redirecting...</div>';

            // Clear the signup form fields immediately
            document.getElementById('signupName').value = '';
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPhone').value = '';
            document.getElementById('signupPassword').value = '';

            // Redirect to dashboard after 1 second
            setTimeout(() => {
                userData = result.user;
                isLoggedIn = true;
                statusDiv.innerHTML = '';
                closeLogin();
                document.getElementById("mainPinSection").style.display = "none";
                document.getElementById("userDashboard").style.display = "block";
                
                // Update the auth link in header
                if (typeof updateAuthLink === 'function') {
                    updateAuthLink(true);
                }
                
                loadUserDashboard();
            }, 1000);
        } else {
            statusDiv.innerHTML = `<div class="status error">❌ ${result.error || "Signup failed"}</div>`;
        }
    } catch (error) {
        console.error("Signup error:", error);
        statusDiv.innerHTML = '<div class="status error">❌ Connection error. Please try again.</div>';
    }
}

// Check for existing user session on page load
function checkUserSession() {
    const savedToken = localStorage.getItem('userToken');
    const savedData = localStorage.getItem('userData');

    console.log('=== CHECK USER SESSION ===');
    console.log('Token exists:', !!savedToken);
    console.log('User data exists:', !!savedData);

    if (savedToken && savedData) {
        userData = JSON.parse(savedData);
        isLoggedIn = true;

        console.log('✅ User session found:', userData);

        const mainSection = document.getElementById("mainPinSection");
        const dashboardSection = document.getElementById("userDashboard");
        
        console.log('Main section element:', mainSection);
        console.log('Dashboard element:', dashboardSection);

        if (mainSection) {
            mainSection.style.display = "none";
            console.log('✅ Main section hidden');
        } else {
            console.error('❌ Main section not found!');
        }
        
        if (dashboardSection) {
            dashboardSection.style.display = "block";
            console.log('✅ Dashboard set to display: block');
            console.log('Dashboard computed style:', window.getComputedStyle(dashboardSection).display);
        } else {
            console.error('❌ Dashboard element not found!');
        }

        // Update the auth link in header
        if (typeof updateAuthLink === 'function') {
            updateAuthLink(true);
        }

        loadUserDashboard();
    } else {
        console.log('ℹ️ No user session found');
        if (typeof updateAuthLink === 'function') {
            updateAuthLink(false);
        }
    }
}

// Auto-check on page load
window.addEventListener('load', checkUserSession);

// Start creating pin for customer
function startPinCreation() {
    // Hide user dashboard, show main pin section
    document.getElementById("userDashboard").style.display = "none";
    document.getElementById("mainPinSection").style.display = "block";

    // Initialize the map
    initializeMap();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Return to user dashboard
function returnToDashboard() {
    if (isLoggedIn) {
        document.getElementById("mainPinSection").style.display = "none";
        document.getElementById("userDashboard").style.display = "block";
        loadUserDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
