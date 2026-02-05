# Removed Files Log

This file tracks intentionally removed files and how to restore them if needed.

---

## 📅 February 5, 2026 - Removed PayMongo Service

### File Removed
- `services/paymentService.js` (145 lines)

### Reason
- PayMongo integration was replaced with Xendit + Stripe
- File was never imported or used anywhere in codebase
- Routes had comment: "PayMongo removed - not in use"

### What It Did
- Created PayMongo payment links for GCash/Maya/GrabPay/Card
- Verified payment status via PayMongo API
- Handled PayMongo webhook events
- Supported multi-currency payments

### Current Replacement
- **Philippines (PHP)**: Uses Xendit (`services/xenditService.js`)
- **Other SE Asia**: Uses Xendit (`services/xenditService.js`)
- **LATAM**: Uses Stripe Payment Intents (`services/stripePaymentIntents.js`)
- **International**: Uses Stripe Checkout (`services/stripeService.js`)

### How to Restore (if needed)

**If you need PayMongo back:**

1. **Restore the file**: Git revert or recreate from backup below
2. **Add to routes/pin.js**:
   ```javascript
   const { createGCashPayment, verifyPayment } = require('../services/paymentService');
   ```
3. **Modify payment routing** (around line 178 in routes/pin.js):
   ```javascript
   if (currencyInfo.code === 'PHP') {
       paymentGateway = 'paymongo';
       payment = await createGCashPayment(
           paymentAmount,
           `PinMyPlace - GPS Pin for ${sanitizedLocationName}`,
           metadata,
           successUrl,
           'PHP'
       );
   }
   ```
4. **Add environment variable**:
   ```
   PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   ```

---

### File Backup (services/paymentService.js)

```javascript
const axios = require('axios');
const { getCurrency } = require('../config/currencies');

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Create payment link with multi-currency support
async function createGCashPayment(amount, description, metadata = {}, successUrl = null, currencyCode = 'PHP') {
    try {
        // Validate PayMongo key exists
        if (!PAYMONGO_SECRET_KEY) {
            console.error('PayMongo secret key not configured');
            return {
                success: false,
                error: 'Payment system not configured. Please add PAYMONGO_SECRET_KEY to .env file'
            };
        }

        // Get currency info
        const currency = getCurrency(currencyCode);
        const auth = Buffer.from(PAYMONGO_SECRET_KEY).toString('base64');

        const attributes = {
            amount: Math.round(amount * 100), // Convert to cents/smallest unit
            currency: currencyCode, // Set the payment currency
            description: description,
            remarks: metadata.referenceNumber || 'PinMyPlace Payment',
            payment_method_types: ['gcash', 'paymaya', 'grab_pay', 'card'], // Multiple payment options
            metadata: { ...metadata, currency: currencyCode } // Store currency in metadata
        };

        // Add success URL if provided
        if (successUrl) {
            attributes.success_url = successUrl;
        }

        console.log('Creating payment with metadata:', JSON.stringify(metadata, null, 2));

        const response = await axios.post(
            `${PAYMONGO_API_URL}/links`,
            {
                data: {
                    attributes: attributes
                }
            },
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('PayMongo link created with metadata:', response.data.data.attributes.metadata);

        return {
            success: true,
            paymentLink: response.data.data.attributes.checkout_url,
            referenceNumber: response.data.data.id
        };
    } catch (error) {
        console.error('PayMongo payment creation error:', error.response?.data || error.message);

        // Network/DNS error
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: 'Cannot connect to PayMongo. Please check your internet connection or firewall settings.'
            };
        }

        return {
            success: false,
            error: error.response?.data?.errors?.[0]?.detail || 'Failed to create payment link'
        };
    }
}

// Verify payment status
async function verifyPayment(paymentId) {
    try {
        const auth = Buffer.from(PAYMONGO_SECRET_KEY).toString('base64');

        const response = await axios.get(
            `${PAYMONGO_API_URL}/links/${paymentId}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }
        );

        const linkData = response.data.data;
        const status = linkData.attributes.status;
        const payments = linkData.attributes.payments || [];
        const metadata = linkData.attributes.metadata || {};

        return {
            success: true,
            isPaid: status === 'paid',
            status: status,
            paymentDetails: {
                attributes: {
                    metadata: metadata
                }
            },
            payments: payments
        };
    } catch (error) {
        console.error('PayMongo verification error:', error.response?.data || error.message);
        return {
            success: false,
            error: 'Failed to verify payment'
        };
    }
}

// Webhook handler for PayMongo events
function handleWebhook(event) {
    const eventType = event.data.attributes.type;

    switch (eventType) {
        case 'link.payment.paid':
            return {
                type: 'payment_success',
                referenceNumber: event.data.attributes.data.id,
                amount: event.data.attributes.data.attributes.amount / 100
            };
        case 'link.payment.failed':
            return {
                type: 'payment_failed',
                referenceNumber: event.data.attributes.data.id
            };
        default:
            return null;
    }
}

module.exports = {
    createGCashPayment,
    verifyPayment,
    handleWebhook
};
```

---

### Testing After Removal

✅ **Verified**: File was not imported anywhere in active code
✅ **Payment flow**: Still uses Xendit (PHP) + Stripe (others)
✅ **No breaking changes**: Application continues to work normally

---
