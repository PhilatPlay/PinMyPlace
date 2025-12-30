# PinMyPlace Deployment Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file with:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pinmyplace
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

### 3. Start MongoDB

```bash
# Windows
mongod

# Mac/Linux
sudo systemctl start mongod
```

### 4. Run the Server

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

### 5. Access the Application

- **Customer Portal**: http://localhost:3000/index-new.html
- **API Health**: http://localhost:3000/api/health

---

## 📋 Pre-Deployment Checklist

### Backend Setup:

- [x] Node.js v18+ installed
- [x] MongoDB installed and running
- [x] Environment variables configured
- [x] All npm packages installed
- [x] Uploads directory created (`uploads/payment-proofs/`)

### Database:

- [ ] MongoDB connection string updated
- [ ] Database user credentials set
- [ ] Default admin user created (auto-created on first run)

### Security:

- [ ] Change JWT_SECRET to strong random string
- [ ] Update GCash number in index-new.html
- [ ] Enable CORS only for your domain (in production)
- [ ] Add rate limiting (optional but recommended)

### Frontend:

- [ ] Update contact numbers in index-new.html
- [ ] Update support email addresses
- [ ] Test all forms and file uploads
- [ ] Test QR code generation
- [ ] Test map loading (requires internet)

---

## 🧪 Testing

### Test Customer Flow:

1. Open http://localhost:3000/index-new.html
2. Click "Create Your Pin 📍"
3. Allow GPS location
4. Set pin on map
5. Enter location name
6. Click "Pay ₱100 & Get QR Code"
7. Upload test image as payment proof
8. Enter phone number: 09171234567
9. Verify QR code displays
10. Test download/share buttons

### Test Agent Flow:

1. Register test agent:

```bash
# Using curl or Postman
POST http://localhost:3000/api/agent/register
Content-Type: application/json

{
  "email": "testagent@example.com",
  "password": "testpass123",
  "name": "Test Agent",
  "phone": "09171234567",
  "payoutMethod": "gcash",
  "payoutDetails": "09171234567"
}
```

2. Login at http://localhost:3000/index-new.html
3. Click "Agent/Reseller Login"
4. Use credentials from step 1
5. Verify dashboard loads
6. Click "Create Pin for Customer"
7. Complete pin creation
8. Verify commission shows in dashboard
9. Test payout request (requires ₱100 minimum)

---

## 🌐 Production Deployment

### Recommended Stack:

- **Hosting**: DigitalOcean, AWS EC2, Heroku
- **Database**: MongoDB Atlas (free tier available)
- **CDN**: Cloudflare (free)
- **Domain**: Namecheap, GoDaddy

### Environment Variables (Production):

```env
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pinmyplace
JWT_SECRET=<generate-64-char-random-string>
NODE_ENV=production
GCASH_NUMBER=09171234567
SUPPORT_EMAIL=support@pinmyplace.ph
```

### PM2 Process Manager:

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start server.js --name pinmyplace

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Nginx Reverse Proxy:

```nginx
server {
    listen 80;
    server_name pinmyplace.ph www.pinmyplace.ph;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files directly
    location /uploads/ {
        alias /var/www/pinmyplace/uploads/;
    }
}
```

### SSL Certificate (Let's Encrypt):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d pinmyplace.ph -d www.pinmyplace.ph
```

---

## 📊 MongoDB Atlas Setup

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Whitelist IP address (0.0.0.0/0 for all IPs)
4. Create database user
5. Get connection string
6. Update `.env` with connection string

---

## 🔧 Troubleshooting

### Map not loading:

- Check internet connection (Leaflet requires CDN)
- Verify OpenStreetMap tile server is accessible
- Check browser console for CORS errors

### Payment proof upload fails:

- Verify `uploads/payment-proofs/` directory exists
- Check file permissions (755 for directories, 644 for files)
- Verify multer middleware is configured
- Check file size limits (default 5MB)

### Agent login fails:

- Verify JWT_SECRET is set in .env
- Check MongoDB connection
- Verify agent account exists and is active
- Check browser console for errors

### Commission not updating:

- Verify Pin model has `soldByAgent` field populated
- Check agent ID is passed in payment-per-pin.js
- Verify routes/pin.js updates agent stats
- Check MongoDB for agent document updates

---

## 📈 Monitoring

### Recommended Tools:

- **Uptime**: UptimeRobot (free)
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics
- **Logs**: Logtail, Papertrail
- **Performance**: New Relic

### Key Metrics to Monitor:

- API response times
- Database connection pool
- Disk space (for uploads)
- Error rates
- Active agents
- Pins created per day
- Revenue per day

---

## 🔄 Database Backup

### Automated Backup Script:

```bash
#!/bin/bash
# backup-mongo.sh

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups/mongodb"
DB_NAME="pinmyplace"

mongodump --db $DB_NAME --out $BACKUP_DIR/$TIMESTAMP

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

### Restore from Backup:

```bash
mongorestore --db pinmyplace /backups/mongodb/20240115_120000/pinmyplace
```

---

## 🎯 Performance Optimization

### Enable Compression:

```javascript
// In server.js
const compression = require("compression");
app.use(compression());
```

### Add Caching:

```javascript
// In server.js
app.use(
  express.static("public", {
    maxAge: "1d",
    etag: true,
  })
);
```

### Database Indexing:

```javascript
// In models/Pin.js
pinSchema.index({ pinId: 1 });
pinSchema.index({ soldByAgent: 1, createdAt: -1 });
pinSchema.index({ expiresAt: 1 });

// In models/Agent.js
agentSchema.index({ email: 1 });
agentSchema.index({ agentId: 1 });
```

---

## 🚨 Security Hardening

### Rate Limiting:

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

### Helmet Security Headers:

```javascript
const helmet = require("helmet");
app.use(helmet());
```

### Input Validation:

```javascript
const { body, validationResult } = require("express-validator");

app.post(
  "/api/pin/create-with-payment",
  [
    body("customerPhone").isMobilePhone("en-PH"),
    body("locationName").trim().isLength({ min: 3, max: 100 }),
    // ... more validation
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... proceed
  }
);
```

---

## 📞 Support Channels

### For Customers:

- Email: support@pinmyplace.ph
- Phone: 09XX-XXX-XXXX
- Facebook: facebook.com/pinmyplace

### For Agents:

- Email: agents@pinmyplace.ph
- Phone: 09XX-XXX-XXXX
- Telegram: @pinmyplace_agents

### Emergency:

- Server down: devops@pinmyplace.ph
- Security issue: security@pinmyplace.ph

---

## ✅ Launch Checklist

Before going live:

- [ ] All tests passing
- [ ] Production environment variables set
- [ ] MongoDB Atlas configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Payment gateway integrated (or GCash number updated)
- [ ] Contact information updated
- [ ] Terms of service page created
- [ ] Privacy policy page created
- [ ] Agent onboarding documentation ready
- [ ] Customer support system in place
- [ ] Monitoring tools configured
- [ ] Backup system automated
- [ ] Rate limiting enabled
- [ ] Security headers enabled
- [ ] CORS properly configured
- [ ] Error tracking enabled
- [ ] Analytics tracking enabled

---

**Ready to launch! 🚀**

For questions: support@pinmyplace.ph
