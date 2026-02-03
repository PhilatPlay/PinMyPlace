# PinMyPlace

**GPS Location Sharing for Easy Deliveries in the Philippines**

## 📍 Concept

Help Filipinos share their exact location for deliveries using QR codes - no signup required, pay only when you need it!

## 💡 Problem Solved

- No formal addresses in many areas
- Delivery riders getting lost
- Time wasted giving directions over phone
- Inaccurate Google Maps pins
- Can't easily share precise locations

## ✅ Solution

1. User drops a pin on their exact GPS location
2. Pay ₱100 via card or e-wallet (automated payment)
3. Get QR code with coordinates instantly
4. Share with delivery riders
5. Riders scan → exact location opens in Google Maps

## 💰 Business Model

### Pay-Per-Pin (Individual Users)

- **₱100 per pin** - Pay only when you need it
- **Never expires** - Use your pin for years
- **Instant QR code** - Delivered immediately after payment
- **No subscription** - No monthly fees

### Bulk Purchase (Resellers/Entrepreneurs)

- **Buy 10-49 codes:** ₱75 per code (25% discount)
- **Buy 50+ codes:** ₱50 per code (50% discount)
- **Resell at your own price** - Suggested retail: ₱80-100
- **Keep the profit** - No commission splits
- **180-day code validity** - Plenty of time to resell
- **Perfect for micro-entrepreneurs** - Like prepaid load reselling

## 🚀 Tech Stack

**Frontend:**

- HTML5, CSS3, JavaScript (Vanilla, modular)
- Leaflet.js for interactive maps
- QRCode.js for QR generation
- html2canvas for QR downloads

**Backend:**

- Node.js v18+ with Express.js
- MongoDB with Mongoose ODM
- JWT authentication (agents only)
- Stripe API for payments

**Payment Processing:**

- Stripe checkout sessions
- Automated payment verification
- Instant pin activation
- Supports 135+ currencies

## 📋 Setup Instructions

### Prerequisites

- Node.js v18 or higher
- MongoDB (local or Atlas)
- PayMongo account (for payment processing)

### Installation

1. **Clone and Install**

```bash
cd PinMyPlace
npm install
```

2. **Configure Environment**
   Create `.env` file:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_secure_random_string

# PayMongo API Keys (get from https://dashboard.paymongo.com)
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx

# Server
PORT=3000
```

3. **Get PayMongo Keys**

- Sign up at [PayMongo](https://dashboard.paymongo.com)
- Navigate to Developers > API Keys
- Copy your test keys (use live keys in production)
- Paste into `.env` file

4. **Start the Server**

```bash
npm start
```

5. **Open the App**
   Navigate to `http://localhost:3000`

### Testing Payment Flow

See [TESTING.md](./TESTING.md) for detailed testing instructions.

**Quick Test:**

1. Drop a pin on the map
2. Enter location name
3. Click "Pay ₱100 via GCash Now"
4. Use PayMongo test mode credentials
5. Complete payment
6. Get your QR code!

## 🎯 Target Users

**Primary:**

- Online sellers (Shopee/Lazada/Facebook Marketplace)
- Remote workers ordering regular deliveries
- People in subdivisions with confusing layouts
- Provincial areas without street names

**Agents/Resellers:**

- Sari-sari store owners
- Tricycle drivers
- Barangay entrepreneurs
- Community organizers

## 📱 Key Features

✅ **No Login Required** - Customers just pay and get QR  
✅ **Instant Payment** - Automated GCash via PayMongo  
✅ **90-Day Validity** - Long-lasting pins for repeat use  
✅ **GPS Accuracy** - Precision location down to meters  
✅ **QR Code Download** - Save and share easily  
✅ **Agent Dashboard** - Track sales and earnings  
✅ **Mobile Responsive** - Works on all devices  
✅ **Google Maps Integration** - Opens directly in maps app

## 🔐 Security Features

- Coordinates hidden until payment verified
- QR code only shown after confirmed payment
- Automatic payment verification via PayMongo API
- Prevents duplicate pins for same payment
- Secure agent authentication with JWT
- Payment metadata encrypted in transit

## 📊 File Structure

```
PinMyPlace/
├── public/
│   ├── index.html              # Main customer interface
│   ├── payment-success.html    # Payment success page
│   ├── agent-dashboard.html    # Agent management
│   ├── css/
│   │   └── styles.css         # Global styles
│   └── js/
│       ├── map.js             # Leaflet map logic
│       ├── payment-per-pin.js # Payment flow
│       ├── agent.js           # Agent functionality
│       └── utils.js           # Utilities (QR, status)
├── routes/
│   ├── pin.js                 # Pin CRUD + payment
│   ├── agent.js               # Agent operations
│   └── auth.js                # Authentication
├── models/
│   ├── Pin.js                 # Pin schema
│   ├── Agent.js               # Agent schema
│   └── User.js                # User schema (legacy)
├── services/
│   └── paymentService.js      # PayMongo integration
├── server.js                  # Express server
├── .env                       # Environment config
├── package.json               # Dependencies
├── README.md                  # This file
├── TESTING.md                 # Testing guide
└── SECURITY.md                # Security documentation
```

## 🔧 API Endpoints

### Pin Management

- `POST /api/pin/initiate-payment` - Create payment link
- `POST /api/pin/create-with-payment` - Verify & create pin
- `GET /api/pin/:pinId` - Get pin details
- `POST /api/pin/renew/:pinId` - Renew expired pin
- `POST /api/pin/webhook` - PayMongo webhook handler

### Agent Management

- `POST /api/agent/register` - Create agent account
- `POST /api/agent/login` - Agent authentication
- `GET /api/agent/stats` - Sales statistics
- `POST /api/agent/payout-request` - Request commission payout

## 🚀 Deployment

### Production Checklist

1. ✅ Switch to live PayMongo keys
2. ✅ Set MongoDB to Atlas production cluster
3. ✅ Configure PayMongo webhooks with domain
4. ✅ Set up SSL certificate (HTTPS required)
5. ✅ Configure environment variables on hosting
6. ✅ Test with real GCash payment
7. ✅ Set up monitoring and logging
8. ✅ Configure CORS for production domain

### Recommended Hosting

- **Render.com** - Easy Node.js deployment
- **Railway.app** - Zero-config deployments
- **Heroku** - Established platform
- **DigitalOean** - VPS option

## 💳 PayMongo Integration

The app uses PayMongo for automated GCash payments:

1. **Payment Link Creation** - Generated when user clicks pay
2. **Metadata Storage** - Location data stored in payment
3. **GCash Redirect** - User completes payment in app
4. **Automatic Verification** - Backend checks payment status
5. **Pin Creation** - Instant QR code after confirmation

No manual verification needed - fully automated!

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## 📄 License

Private project - All rights reserved

## 📞 Support

For issues or questions, create an issue in this repository.

---

**Made with ❤️ for Filipino online sellers and delivery riders**
