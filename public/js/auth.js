// Authentication State
let authToken = "";
let currentUser = null;

// Login function
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const statusDiv = document.getElementById("authStatus");

    if (!email || !password) {
        statusDiv.innerHTML = '<div class="status error">Please enter email and password</div>';
        return;
    }

    try {
        statusDiv.innerHTML = '<div class="status info">Logging in...</div>';

        const response = await fetch("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            authToken = result.token;
            currentUser = result.user;

            // Store in localStorage for persistence
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            statusDiv.innerHTML = '<div class="status success">✅ Login successful!</div>';

            // Hide auth card and show GPS demo
            document.getElementById("authCard").style.display = "none";
            document.getElementById("gpsDemo").style.display = "block";

            // Show admin section only for admin users
            if (currentUser && currentUser.role === 'admin') {
                document.getElementById("adminSection").style.display = "block";
            }

            console.log("Logged in as:", currentUser);
        } else {
            statusDiv.innerHTML = `<div class="status error">❌ Login failed: ${result.error || "Invalid credentials"
                }</div>`;
        }
    } catch (error) {
        console.error("Login error:", error);
        statusDiv.innerHTML =
            '<div class="status error">❌ Connection error. Please try again.</div>';
    }
}

// Logout function
function logout() {
    authToken = "";
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    document.getElementById("authCard").style.display = "block";
    document.getElementById("gpsDemo").style.display = "none";
    document.getElementById("adminSection").style.display = "none";

    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
}

// Check for existing session on page load
function checkExistingSession() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');

    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);

        document.getElementById("authCard").style.display = "none";
        document.getElementById("gpsDemo").style.display = "block";

        if (currentUser && currentUser.role === 'admin') {
            document.getElementById("adminSection").style.display = "block";
        }
    }
}

// Get authentication headers
function getAuthHeaders() {
    if (!authToken) {
        return {};
    }
    return {
        Authorization: `Bearer ${authToken}`,
    };
}

// Register new user
async function register() {
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const name = document.getElementById("regName").value;
    const phone = document.getElementById("regPhone").value;
    const statusDiv = document.getElementById("regStatus");

    if (!email || !password) {
        statusDiv.innerHTML = '<div class="status error">Email and password are required</div>';
        return;
    }

    try {
        statusDiv.innerHTML = '<div class="status info">Creating account...</div>';

        const response = await fetch("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password, name, phone }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            authToken = result.token;
            currentUser = result.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            statusDiv.innerHTML = '<div class="status success">✅ Account created successfully!</div>';

            // Redirect to main app
            setTimeout(() => {
                document.getElementById("authCard").style.display = "none";
                document.getElementById("gpsDemo").style.display = "block";
            }, 1500);
        } else {
            statusDiv.innerHTML = `<div class="status error">❌ Registration failed: ${result.error || "Please try again"
                }</div>`;
        }
    } catch (error) {
        console.error("Registration error:", error);
        statusDiv.innerHTML =
            '<div class="status error">❌ Connection error. Please try again.</div>';
    }
}

// Toggle between login and register forms
function showRegisterForm() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
}

function showLoginForm() {
    document.getElementById("registerForm").style.display = "none";
    document.getElementById("loginForm").style.display = "block";
}
