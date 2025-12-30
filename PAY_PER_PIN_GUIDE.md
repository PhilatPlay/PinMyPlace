# PinMyPlace - Pay-Per-Pin + Bulk Purchase Model

## 🎯 Business Model Overview

PinMyPlace operates on a dual-revenue model:
1. **Direct Sales** - Individual users pay ₱100 per pin
2. **Bulk Sales** - Resellers buy codes in bulk at wholesale prices and resell for profit

### Key Features:

- ✅ **Pay-per-pin**: ₱100 per pin for direct customers
- ✅ **Bulk Purchase**: Buy 10+ codes at ₱50-75 each (wholesale)
- ✅ **Reseller Model**: Similar to prepaid load distribution
- ✅ **No Login Required**: Customers get instant QR code
- ✅ **No Commission Hassles**: Resellers keep 100% of their markup

---

## 💰 Pricing Structure

### For Individual Customers:

- **₱100 per pin** - One-time payment via GCash/Maya/GrabPay/Card
- **90-day validity** - Pin expires after 3 months
- **Renewal**: ₱100 to extend for another 90 days
- **No account needed** - Just pay and get QR code

### For Bulk Buyers (Resellers):

- **Tier 1 (10-49 codes):** ₱75 per code (25% discount)
- **Tier 2 (50+ codes):** ₱50 per code (50% discount)
- **Code validity:** 180 days from purchase
- **Minimum purchase:** 10 codes
- **One-time use:** Each code creates one pin only

---

## 🏪 Bulk Reseller Model

Inspired by how prepaid load is sold in the Philippines - resellers operate like sari-sari stores or street vendors.

### How It Works:

1. **Reseller buys bulk codes** (e.g., 50 codes at ₱50 each = ₱2,500)
2. **Receives access codes** instantly (downloadable text file)
3. **Customer asks for a pin** 
4. **Reseller sells code** for ₱80-100 (their choice)
5. **Customer redeems code** on website to create pin
6. **Reseller keeps the profit** (₱30-50 per code)

### Reseller Benefits:

- **Work from anywhere** (street corner, sari-sari store, home, online)
- **No inventory management** - just digital codes
- **No commission tracking** - keep all your markup
- **No subscription fees** - just buy codes when needed
- **Low overhead** - customers can redeem codes themselves
- **Scalable** - buy more when you sell out

### Example Earnings:

**Scenario 1: Buy 10 codes at ₱75 each**
- Cost: ₱750
- Sell at ₱95 each: ₱950
- **Profit: ₱200** (27% margin)

**Scenario 2: Buy 50 codes at ₱50 each**
- Cost: ₱2,500
- Sell at ₱90 each: ₱4,500
- **Profit: ₱2,000** (80% margin)

**Scenario 3: Buy 100 codes at ₱50 each**
- Cost: ₱5,000
- Sell at ₱85 each: ₱8,500
- **Profit: ₱3,500** (70% margin)

---

## 🔧 Technical Implementation

### Backend Routes

#### Pin Routes (`/api/pin`)

- `POST /initiate-payment` - Create PayMongo payment link for ₱100
- `POST /create-with-payment` - Verify payment and create pin
- `POST /create-with-code` - Redeem bulk access code and create pin
- `GET /:pinId` - Public lookup of pin details
- `POST /renew/:pinId` - Renew expired pin for ₱100

#### Bulk Routes (`/api/bulk`)

- `POST /purchase` - Initiate bulk code purchase (10+ codes)
- `POST /verify-and-generate` - Verify payment and generate access codes
- `POST /validate-code` - Check if code is valid before redemption

### Database Models

#### Pin Model

```javascript
{
  pinId: String,             // Unique: PIN-XXXXXXXX
  locationName: String,
  customerPhone: String,
  correctedLatitude: Number,
  correctedLongitude: Number,
  paymentMethod: String,     // 'gcash', 'paymaya', 'bulk_code'
  redemptionMethod: String,  // 'payment' or 'bulk_code'
  redeemedCode: String,      // Code used (if bulk purchase)
  paymentStatus: String,     // 'verified' or 'code_redeemed'
  expiresAt: Date,          // 90 days from creation
}
```

#### BulkCode Model (NEW)

```javascript
{
  code: String,              // DL-XXXXXXXX (unique)
  purchaseEmail: String,
  purchasePhone: String,
  unitPrice: Number,         // ₱50 or ₱75 depending on quantity
  totalPaid: Number,
  paymentReferenceId: String,
  isUsed: Boolean,           // false until redeemed
  usedAt: Date,
  usedByPhone: String,
  redeemedPinId: String,     // Links to created pin
  purchasedAt: Date,
  expiresAt: Date            // 180 days from purchase
}
  password: String,             // Hashed
  name: String,
  phone: String,
  subscriptionAmount: Number,   // ₱300
  subscriptionExpiresAt: Date,
  totalPinsSold: Number,
  totalEarnings: Number,
  pendingCommission: Number,    // Ready to withdraw
  paidCommission: Number,       // Historical payouts
  payoutMethod: String,         // gcash, bank, cash
  payoutDetails: String         // GCash number or account
}
```

### Frontend Files

- **index-new.html** - Pay-per-pin interface
- **js/payment-per-pin.js** - Payment flow without login
- **js/agent.js** - Agent dashboard and authentication
- **js/map.js** - Leaflet map with GPS correction
- **js/utils.js** - QR code generation

---

## 🚀 User Flows

### Customer Flow (No Login):

1. Visit website
2. Click "Create Your Pin"
3. Enable GPS location
4. Adjust pin on map to exact delivery spot
5. Enter location name
6. Click "Pay ₱100 & Get QR Code"
7. Upload GCash payment screenshot
8. Enter phone number
9. Get QR code instantly
10. Download/share QR code with delivery riders

### Agent Flow:

1. Login with agent credentials
2. View dashboard (today's sales, month stats, commission balance)
3. Click "Create Pin for Customer"
4. Help customer set location on map
5. Collect ₱100 cash from customer
6. Upload payment proof (can use agent's GCash)
7. Customer gets QR code
8. Agent earns ₱50 commission automatically
9. Return to dashboard
10. Request payout when commission reaches ₱100

---

## 📱 Payment Integration

### Current Implementation:

- **Manual GCash verification** via screenshot upload
- Agent or customer uploads proof to GCash number: **0917-XXX-XXXX**
- Payment auto-verified on upload (instant QR generation)

### Future Integration:

- **PayMongo API** - Instant GCash/Maya/Card payments
- **Xendit API** - E-wallet integration
- **SMS verification** - Send QR code via SMS
- **Real-time payment webhooks** - Instant verification

---

## 🎓 Agent Onboarding

### Registration Process:

```javascript
POST /api/agent/register
{
  "email": "agent@example.com",
  "password": "securepass",
  "name": "Juan Dela Cruz",
  "phone": "09171234567",
  "payoutMethod": "gcash",
  "payoutDetails": "09171234567"
}
```

Response includes:

- Agent ID (AGT-XXXXXX)
- JWT token (valid 30 days)
- 7-day trial period
- Auto-subscription billing after trial

### Commission Payout:

```javascript
POST /api/agent/request-payout
Headers: { Authorization: Bearer <token> }
```

Requirements:

- Minimum ₱100 pending commission
- Active subscription
- Valid payout method registered

---

## 📊 Business Metrics to Track

### For Platform:

- Total pins created per day/month
- Direct customer pins vs agent pins
- Average pins per agent
- Agent retention rate
- Agent subscription renewal rate
- Revenue breakdown (direct vs agent)

### For Agents:

- Pins sold today/month
- Commission earned today/month
- Pending vs paid commission
- Average earnings per day
- Subscription ROI

---

## 🔮 Future Enhancements

### Short-term:

- [ ] SMS QR code delivery (send via text)
- [ ] Actual payment gateway integration
- [ ] Agent performance leaderboard
- [ ] Referral bonuses for agents
- [ ] Bulk pin creation for businesses

### Long-term:

- [ ] Mobile app (React Native)
- [ ] Multi-level marketing (sub-agents)
- [ ] Corporate accounts (bulk discounts)
- [ ] Integration with delivery platforms (Lalamove, Grab)
- [ ] International expansion (Indonesia, Vietnam)

---

## 🇵🇭 Why This Works in the Philippines

1. **Cash culture** - People prefer pay-as-you-go vs subscriptions
2. **Sari-sari store model** - Trusted neighborhood distribution
3. **High smartphone penetration** - Everyone has GCash
4. **Delivery boom** - Shopee, Lazada, food delivery surge
5. **GPS issues** - Wrong pins are a real problem
6. **Side hustle culture** - Agents can earn extra income

---

## 💡 Marketing Strategy

### For Customers:

- "₱100 solves your delivery address problem forever!"
- "No more wrong deliveries - pin your exact location"
- "Delivery riders find you in 1 click"

### For Agents:

- "Earn ₱50 per customer - no inventory needed!"
- "Like selling load, but for addresses"
- "Turn your store into a pin creation hub"
- "₱300/month = unlimited earning potential"

### Distribution Channels:

- Facebook groups (delivery riders, online sellers)
- Sari-sari store partnerships
- Community centers
- Shopping malls (kiosks)
- University campuses

---

## 🔐 Security Considerations

- GCash payment proof verification (prevent fraud)
- Rate limiting on pin creation
- Agent account verification (KYC)
- Commission payout auditing
- Prevent duplicate payment proofs
- Monitor suspicious agent activity

---

## 📞 Support & Contact

- **Customer Support**: 09XX-XXX-XXXX
- **Agent Onboarding**: agents@pinmyplace.ph
- **Technical Issues**: support@pinmyplace.ph
- **Partnership Inquiries**: partnerships@pinmyplace.ph

---

## 🎯 Success Metrics

### Month 1 Goal:

- 50 active agents
- 1,000 pins created
- ₱100,000 revenue (₱50,000 to platform, ₱50,000 to agents)

### Month 3 Goal:

- 200 active agents
- 10,000 pins created
- ₱1,000,000 revenue

### Month 6 Goal:

- 500 active agents
- 50,000 pins created
- ₱2,500,000 revenue
- Break-even or profitability

---

**Built with ❤️ for Filipino delivery recipients and entrepreneurs**
