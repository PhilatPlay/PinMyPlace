# PinMyPlace - Refactored Project Structure

## 🎉 Light Refactor Complete!

Your project has been refactored into a clean, maintainable structure with payment processing capabilities.

## 📁 New Project Structure

```
PinMyPlace/
├── public/                    # Frontend files
│   ├── index.html            # Main HTML (refactored)
│   ├── css/
│   │   └── styles.css        # All CSS styles
│   └── js/
│       ├── auth.js           # Authentication logic
│       ├── map.js            # Map initialization & markers
│       ├── location.js       # Location registration & lookup
│       ├── payment.js        # Payment processing
│       └── utils.js          # Utility functions & QR codes
│
├── models/                    # Database models
│   ├── User.js               # User model (with premium support)
│   ├── Location.js           # Location model
│   └── Payment.js            # Payment model (NEW!)
│
├── routes/                    # API routes
│   ├── auth.js               # Authentication endpoints
│   ├── gps.js                # GPS location endpoints
│   └── payment.js            # Payment endpoints (NEW!)
│
├── middleware/                # Middleware
│   └── auth.js               # JWT authentication
│
├── uploads/                   # File uploads
│   └── payment-proofs/       # Payment screenshots (NEW!)
│
├── scripts/                   # Utility scripts
│   └── seed-users.js         # Create default users
│
├── server.js                  # Main server (updated)
├── package.json              # Dependencies (updated with multer)
├── .env                      # Environment variables
├── .gitignore                # Git ignore
└── README.md                 # This file

```

## ✨ What's New

### Frontend Refactored

- **Modular JavaScript**: Separated into 5 focused files
- **Clean CSS**: All styles in one file
- **Better Organization**: Easier to maintain and debug
- **User Registration**: Added signup form
- **Premium Features**: Pricing plans and upgrade flow

### Payment System

- **Multiple Methods**: GCash, PayMaya, Card support
- **Proof Upload**: Users can upload payment screenshots
- **Admin Approval**: Manual verification workflow
- **Premium Plans**: Monthly (₱29) and Yearly (₱299)
- **Secure**: File upload with validation

### Enhanced Features

- **Session Persistence**: Auto-login with localStorage
- **Premium Badge**: Visual indicator for premium users
- **Location Limits**: Free users limited to 1 location
- **Better UX**: Cleaner interface and messaging

## 🚀 Getting Started

### 1. Install New Dependencies

```powershell
npm install
```

### 2. Start the Server

```powershell
npm run dev
```

### 3. Access the Application

Open: **http://localhost:3000**

## 💳 Payment Flow

### For Users:

1. Click "Upgrade to Premium"
2. Choose Monthly or Yearly plan
3. Select payment method (GCash/PayMaya)
4. Upload payment screenshot
5. Wait for admin approval (24 hours)

### For Admins:

1. Login as admin
2. Navigate to `/payment/admin/pending` endpoint
3. Review payment proofs
4. Approve via `/payment/admin/approve/:paymentId`

## 🔧 API Endpoints

### Payment Endpoints (NEW!)

- `POST /payment/create-checkout` - Create payment session
- `POST /payment/submit-proof` - Upload payment proof
- `GET /payment/verify/:paymentId` - Check payment status
- `GET /payment/my-payments` - User's payment history
- `POST /payment/admin/approve/:paymentId` - Admin approve payment
- `GET /payment/admin/pending` - Get pending payments

### Existing Endpoints

- Authentication: `/auth/*`
- GPS Locations: `/gps/*`

## 📱 Payment Methods Supported

1. **GCash** - Mobile wallet payment
2. **PayMaya** - Mobile wallet payment
3. **Bank Transfer** - Direct bank transfer
4. **Card** - Credit/Debit cards (coming soon)

## 🎯 Premium Features

### Free Plan

- 1 active location
- QR code generation
- 30-day expiration
- Basic support

### Premium Plan (₱29/month or ₱299/year)

- ✓ Unlimited locations
- ✓ Custom QR designs
- ✓ Never expires
- ✓ Delivery notes
- ✓ Priority support
- ✓ Location analytics

## 🔐 Security

- JWT token authentication
- Password hashing with bcrypt
- File upload validation
- Admin-only routes protected
- Secure payment proof storage

## 📝 To-Do

- [ ] Integrate with actual payment gateway APIs (PayMongo, Xendit)
- [ ] Add email notifications for payment confirmations
- [ ] Create admin dashboard for payment management
- [ ] Add location analytics for premium users
- [ ] Implement custom QR code designs
- [ ] Add SMS notifications

## 🐛 Troubleshooting

### Payment Proof Upload Fails

- Check uploads/ directory exists and has write permissions
- Ensure file is an image (JPG, PNG)
- File size must be under 5MB

### Premium Status Not Updating

- Check payment status in database
- Ensure admin approved the payment
- Clear browser localStorage and login again

## 📞 Support

For issues or questions, contact the development team.

---

**PinMyPlace** - Making deliveries easier in the Philippines 🇵🇭
