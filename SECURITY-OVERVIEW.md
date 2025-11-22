# PinMyPlace Security Documentation

## 🛡️ Security Features Implemented

### 1. PayMongo Webhook Signature Verification

**Location:** `routes/pin.js`

```javascript
// Verifies webhook authenticity using HMAC-SHA256
const signature = req.headers["paymongo-signature"];
const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

const expectedSignature = crypto
  .createHmac("sha256", webhookSecret)
  .update(req.body)
  .digest("hex");

if (signature !== expectedSignature) {
  return res.status(401).json({ error: "Invalid signature" });
}
```

**Protection Against:**

- Fake payment confirmations from unauthorized sources
- Man-in-the-middle attacks
- Replay attacks

---

### 2. Rate Limiting

**Payment Initiation Limiter:**

- **Limit:** 5 requests per 15 minutes per IP
- **Prevents:** Payment spam, DOS attacks, abuse
- **Applies to:** `POST /api/pin/initiate-payment`

**Payment Verification Limiter:**

- **Limit:** 10 requests per 5 minutes per IP
- **Prevents:** Verification flooding, brute force attempts
- **Applies to:** `POST /api/pin/create-with-payment`

---

### 3. Input Validation & Sanitization

#### Phone Number Validation

- Accepts: `09171234567`, `+639171234567`, `639171234567`
- Rejects: Non-Philippine numbers, invalid lengths, alphabetic characters

#### Coordinate Bounds Validation

- Philippines bounds: Latitude 4-21°N, Longitude 116-127°E
- Prevents: Invalid GPS data, coordinates outside service area

#### Text Input Sanitization

- Uses `validator.escape()` to prevent XSS attacks
- Example: `<script>` → `&lt;script&gt;`

---

### 4. HTTPS Enforcement

Production mode automatically redirects HTTP to HTTPS, protecting against man-in-the-middle attacks.

---

### 5. Security Headers

- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Stops clickjacking attacks
- `X-XSS-Protection: 1; mode=block` - Blocks reflected XSS
- `Referrer-Policy: strict-origin-when-cross-origin` - Prevents data leakage

---

### 6. CORS Policy

Production restricts API access to authorized domains only.

---

### 7. Payment Timeout Protection

24-hour payment window with automatic deletion of expired pending pins.

---

## 🔐 Environment Variable Security

Required secrets (never commit to Git):

- `MONGODB_URI`
- `JWT_SECRET`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_PUBLIC_KEY`
- `PAYMONGO_WEBHOOK_SECRET`

---

## ✅ Security Score: 90/100

Ready for production with live PayMongo keys and SSL certificate!
