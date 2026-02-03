# Stripe Payment Testing Guide

## Testing the Payment Flow

### Step 1: Start the Server

```bash
npm start
```

### Step 2: Open the App

Navigate to `http://localhost:3000`

### Step 3: Create a Pin

1. Click the **"📍 Drop a Pin on the Map"** button to enable location
2. Click on the map to set your delivery location
3. Drag the blue marker to fine-tune the exact location
4. Enter a location name (e.g., "My House", "Office Building")
5. Add optional landmarks/address details
6. Click **"Next: Proceed to Payment"**

### Step 4: Pay with Card or E-Wallet

1. Enter your mobile number (11 digits, e.g., 09171234567)
2. Click **"Pay ₱100 via GCash Now"**
3. You'll be redirected to Stripe's payment page

### Step 5: Complete Payment

**For Testing (Stripe Test Mode):**

- Use test card: 4242 4242 4242 4242
- Any future expiry date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)
- Any billing ZIP code

**For Live Payments:**

- Enter your actual card details or select e-wallet (GCash, GrabPay, etc.)
- Complete authentication if required
- Confirm payment

### Step 6: Get Your QR Code

After successful payment:

- You'll be automatically redirected to the success page
- Your QR code will be generated with GPS coordinates
- Download the QR code image
- Share with delivery riders

## Testing Webhook (Optional)

PayMongo webhooks require a publicly accessible URL. For local testing:

### Option 1: Use ngrok

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Option 2: Configure PayMongo Webhook

1. Go to PayMongo Dashboard
2. Navigate to Developers > Webhooks
3. Add webhook endpoint: `https://your-domain.com/api/pin/webhook`
4. Select events: `link.payment.paid`, `link.payment.failed`
5. Save and test

## Test Agent/Reseller Flow

### Step 1: Create Agent Account

```bash
# Use agent registration endpoint
POST http://localhost:3000/api/agent/register
{
  "name": "Juan dela Cruz",
  "phone": "09171234567",
  "email": "juan@example.com",
  "password": "secure123",
  "barangay": "Barangay 123, Manila"
}
```

### Step 2: Agent Login

1. Click **"Agent Login"** in the header
2. Enter phone number and password
3. You'll see agent dashboard with stats

### Step 3: Sell Pin as Agent

1. Stay logged in as agent
2. Follow the same pin creation flow
3. Your agent ID will be automatically attached
4. You'll earn ₱50 commission per pin

### Step 4: Check Agent Stats

- View your dashboard for:
  - Total pins sold
  - Total earnings
  - Pending commission
  - Subscription status

## Common Issues

### Payment Link Not Generated

- Check console for errors
- Verify `.env` has correct PayMongo keys
- Ensure MongoDB is connected
- Check PAYMONGO_SECRET_KEY format

### Payment Not Verified

- Wait 5-10 seconds after payment
- PayMongo may take time to update status
- Check PayMongo dashboard for payment status
- Try refreshing the success page

### QR Code Not Showing

- Check browser console for errors
- Ensure payment was actually completed
- Verify payment reference in URL (`?ref=link_xxx`)
- Check MongoDB for pin creation

### Webhook Not Receiving Events

- Verify webhook URL is publicly accessible
- Check PayMongo dashboard webhook logs
- Ensure webhook endpoint responds with 200
- Check server logs for incoming requests

## Debugging

### Check Payment Status Manually

```javascript
// In browser console on success page
fetch("/api/pin/create-with-payment", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    paymentReferenceId: "link_xxxxxxxxxxxxx", // From URL
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

### View Pin in Database

```bash
# MongoDB shell
use pinmyplace
db.pins.find().sort({ createdAt: -1 }).limit(1).pretty()
```

### Check Server Logs

Watch the terminal running `npm start` for:

- Payment creation requests
- PayMongo API responses
- Payment verification calls
- Pin creation confirmations

## Expected Flow

1. **User Action**: Clicks "Pay ₱100 via GCash Now"
2. **Frontend**: Calls `/api/pin/initiate-payment` with location data
3. **Backend**: Creates PayMongo payment link with metadata
4. **Redirect**: User sent to PayMongo checkout page
5. **Payment**: User completes GCash payment
6. **Return**: PayMongo redirects to `/payment-success.html?ref=link_xxx`
7. **Verification**: Success page calls `/api/pin/create-with-payment`
8. **Backend**: Verifies payment with PayMongo API
9. **Creation**: Creates Pin in database with verified status
10. **Display**: Shows QR code with GPS coordinates

## Success Criteria

✅ Payment link created successfully  
✅ Redirected to PayMongo page  
✅ Payment completed (test or real)  
✅ Returned to success page  
✅ Pin created in database  
✅ QR code displayed with coordinates  
✅ Can download QR code image  
✅ Agent commission tracked (if agent)

## Next Steps After Testing

1. Switch to live PayMongo keys in production
2. Set up domain-based webhooks
3. Add email notifications (optional)
4. Deploy to production server
5. Test with real GCash payments
6. Monitor PayMongo dashboard for transactions
