# PinMyPlace - Pay-Per-Pin Business Model Guide

## 🎯 Business Model Overview

PinMyPlace has pivoted from a subscription-based model to a **pay-per-pin** model with a **street-level agent distribution network**.

### Key Changes:

- ❌ **OLD**: ₱29/month subscription (vulnerable to reselling)
- ✅ **NEW**: ₱50 per pin (one-time payment)
- ✅ **Agent Network**: Agents pay ₱300/month to sell unlimited pins
- ✅ **No Login Required**: Customers get instant QR code without creating account

---

## 💰 Pricing Structure

### For Customers:

- **₱50 per pin** - One-time payment via GCash
- **90-day validity** - Pin expires after 3 months
- **Renewal**: ₱50 to extend for another 90 days
- **No account needed** - Just upload payment proof and get QR code

### For Agents/Resellers:

- **₱300/month subscription** to become an agent
- **₱25 commission per pin** sold (50% split)
- **Unlimited pins** - Sell as many as you can
- **Minimum payout**: ₱100 (accumulated commissions)
- **Payout time**: 1-2 business days via GCash or bank

---

## 🏪 Agent Distribution Model

Inspired by how prepaid load is sold in the Philippines - agents operate like sari-sari stores or street vendors.

### How It Works:

1. **Agent pays ₱300/month** subscription fee
2. **Customer comes to agent** asking for a pin
3. **Agent collects ₱50 cash** from customer
4. **Agent creates pin** using customer's phone/location
5. **Customer gets QR code** instantly
6. **Agent keeps ₱25** commission automatically
7. **Platform gets ₱25** per pin

### Agent Benefits:

- Work from anywhere (street corner, sari-sari store, home)
- No inventory to manage
- Instant commission tracking in dashboard
- Weekly or monthly payouts
- Low overhead - just need internet connection

### Example Earnings:

- **5 pins/day** = ₱125/day = ₱3,750/month (minus ₱300 subscription = **₱3,450 profit**)
- **10 pins/day** = ₱250/day = ₱7,500/month (minus ₱300 subscription = **₱7,200 profit**)
- **20 pins/day** = ₱500/day = ₱15,000/month (minus ₱300 subscription = **₱14,700 profit**)

---

## 🔧 Technical Implementation

### Backend Routes

#### Pin Routes (`/api/pin`)

- `POST /create-with-payment` - Create pin with GCash proof upload
- `GET /:pinId` - Public lookup of pin details
- `POST /renew/:pinId` - Renew expired pin for ₱50

#### Agent Routes (`/api/agent`)

- `POST /register` - Agent registration
- `POST /login` - Agent authentication
- `GET /stats` - Dashboard stats (today, month, total)
- `POST /request-payout` - Request commission payout

### Database Models

#### Pin Model

```javascript
{
  pinId: String,           // Unique: PIN-XXXXXXXX
  locationName: String,    // Customer's location name
  customerPhone: String,   // No account needed
  correctedLatitude: Number,
  correctedLongitude: Number,
  paymentProof: String,    // GCash screenshot path
  soldByAgent: ObjectId,   // Reference to Agent
  agentCommission: Number, // ₱25
  expiresAt: Date,         // 90 days from creation
  isExpired: Boolean
}
```

#### Agent Model

```javascript
{
  agentId: String,              // AGT-XXXXXX
  email: String,
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
6. Click "Pay ₱50 & Get QR Code"
7. Upload GCash payment screenshot
8. Enter phone number
9. Get QR code instantly
10. Download/share QR code with delivery riders

### Agent Flow:

1. Login with agent credentials
2. View dashboard (today's sales, month stats, commission balance)
3. Click "Create Pin for Customer"
4. Help customer set location on map
5. Collect ₱50 cash from customer
6. Upload payment proof (can use agent's GCash)
7. Customer gets QR code
8. Agent earns ₱25 commission automatically
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

- "₱50 solves your delivery address problem forever!"
- "No more wrong deliveries - pin your exact location"
- "Delivery riders find you in 1 click"

### For Agents:

- "Earn ₱25 per customer - no inventory needed!"
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
- ₱50,000 revenue (₱25,000 to platform, ₱25,000 to agents)

### Month 3 Goal:

- 200 active agents
- 10,000 pins created
- ₱500,000 revenue

### Month 6 Goal:

- 500 active agents
- 50,000 pins created
- ₱2,500,000 revenue
- Break-even or profitability

---

**Built with ❤️ for Filipino delivery recipients and entrepreneurs**
