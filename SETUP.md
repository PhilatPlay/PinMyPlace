# PinMyPlace - Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **MongoDB** (local or cloud)
3. **Git** (optional)

## Installation Steps

### 1. Install Dependencies

```powershell
npm install
```

### 2. MongoDB Setup

**Option A: Local MongoDB**

- Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
- Start MongoDB service:
  ```powershell
  net start MongoDB
  ```

**Option B: MongoDB Atlas (Cloud - Free)**

- Go to https://www.mongodb.com/cloud/atlas
- Create free account and cluster
- Get connection string and update `.env` file

### 3. Configure Environment

Edit `.env` file and update:

```
# Database
MONGODB_URI=mongodb://localhost:27017/pinmyplace

# Security
JWT_SECRET=your-unique-secret-key-here

# Payment Gateways
# Southeast Asia - Xendit (GCash, Maya, GrabPay, etc.)
XENDIT_SECRET_KEY=your-xendit-secret-key

# International - Stripe (Cards, Payment Intents for LATAM/Asia)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

**Payment Gateway Setup:**

1. **Xendit** (Southeast Asia)
   - Sign up at https://dashboard.xendit.co/register
   - Get API keys from Settings → Developers → API Keys
   - Supports: PHP, IDR, THB, MYR, SGD
   - Methods: GCash, Maya, GrabPay, OVO, DANA, FPX, PromptPay

2. **Stripe** (International + LATAM)
   - Sign up at https://dashboard.stripe.com/register
   - Get keys from Developers → API keys
   - Supports: USD, VND, HKD (Stripe Checkout), MXN, BRL, COP, ARS (Payment Intents - cards only)
   - Methods: Cards, Apple Pay, Google Pay
   - Note: LATAM payment methods (OXXO, Boleto) require regional Stripe account approval

### 4. Start the Server

**Development mode (auto-restart on changes):**

```powershell
npm run dev
```

**Production mode:**

```powershell
npm start
```

### 5. Access the Application

Open your browser to: **http://localhost:3000**

## Default Login Accounts

The system creates these accounts automatically:

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| team@blocklogik.com   | Admin123!@#   | admin   |
| user@droplogik.com    | User123!@#    | user    |
| partner@droplogik.com | Partner123!@# | partner |
| philip.polo@yahoo.com | Philip123!@#  | admin   |

## Testing the Features

1. **Login** - Use any demo account
2. **Register Location** - Click "Show Map & Get My Location"
3. **Drag Marker** - Adjust the green marker to your exact location
4. **Add Address** - Give your location a name/description
5. **Register** - Click "Register This Location"
6. **Download QR** - Get the QR code for delivery drivers

## API Endpoints

### Authentication

- `POST /auth/login` - Login
- `POST /auth/register` - Register new user
- `GET /auth/me` - Get current user
- `PUT /auth/profile` - Update profile

### GPS Locations

- `POST /gps/register` - Register location
- `GET /gps/location/:id` - Get location by ID
- `GET /gps/user/:userId/locations` - Get user's locations
- `POST /gps/enhance-precision` - Enhance GPS accuracy
- `DELETE /gps/location/:id` - Delete location

## Troubleshooting

### MongoDB Connection Issues

```powershell
# Check if MongoDB is running
Get-Service MongoDB

# Start MongoDB
net start MongoDB
```

### Port Already in Use

Change `PORT` in `.env` file to a different number (e.g., 3001)

### Module Not Found

```powershell
rm -r node_modules
npm install
```

## Project Structure

```
PinMyPlace/
├── models/          # Database models
│   ├── User.js
│   └── Location.js
├── routes/          # API routes
│   ├── auth.js
│   └── gps.js
├── middleware/      # Auth middleware
│   └── auth.js
├── scripts/         # Utility scripts
│   └── seed-users.js
├── index.html       # Frontend
├── server.js        # Main server
├── package.json     # Dependencies
├── .env             # Configuration
└── SETUP.md         # This file
```

## Next Steps

1. Update branding from "DropLogik" to "PinMyPlace"
2. Add user registration form to frontend
3. Implement premium features (payment integration)
4. Add short URL generation
5. Deploy to production (Heroku, Railway, etc.)

## Support

For issues or questions, contact the development team.
