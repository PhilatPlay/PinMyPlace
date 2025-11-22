# 🚀 Quick Start Checklist

## ✅ Prerequisites Installed

- [ ] Node.js v18 or higher installed
- [ ] MongoDB running (local or Atlas cloud)
- [ ] Git installed (optional)

## 🔑 PayMongo Account Setup

- [ ] Created account at https://dashboard.paymongo.com
- [ ] Verified email address
- [ ] Completed KYC (for live payments)
- [ ] Located API keys in Developers > API Keys
- [ ] Copied test secret key (sk*test*...)
- [ ] Copied test public key (pk*test*...)

## 📁 Project Setup

- [ ] Cloned/downloaded project
- [ ] Ran `npm install`
- [ ] Created `.env` file in root directory
- [ ] Added MongoDB connection string to `.env`
- [ ] Added JWT_SECRET to `.env` (any random string)
- [ ] Added PAYMONGO_SECRET_KEY to `.env`
- [ ] Added PAYMONGO_PUBLIC_KEY to `.env`

## 🗄️ Database Setup

- [ ] MongoDB is running and accessible
- [ ] Connection string tested
- [ ] Database created (pinmyplace) - auto-created on first run

## 🎮 First Run

- [ ] Ran `npm start`
- [ ] Server started without errors
- [ ] Opened http://localhost:3000
- [ ] Map loads correctly
- [ ] Can click to drop pin

## 💳 Payment Testing

- [ ] Clicked "Pay ₱50 via GCash Now"
- [ ] Redirected to PayMongo payment page
- [ ] Used test GCash credentials from PayMongo
- [ ] Completed test payment
- [ ] Redirected back to success page
- [ ] QR code displayed with coordinates
- [ ] Can download QR code image

## 👥 Agent Testing (Optional)

- [ ] Created agent account via API or interface
- [ ] Logged in as agent
- [ ] Dashboard shows with stats
- [ ] Created pin while logged in as agent
- [ ] Commission tracked correctly (₱25)

## 🌐 Production Preparation (When Ready)

- [ ] Switched to live PayMongo keys (sk*live*... and pk*live*...)
- [ ] Configured production MongoDB database
- [ ] Set up domain name
- [ ] SSL certificate installed (HTTPS)
- [ ] Environment variables set on hosting platform
- [ ] PayMongo webhooks configured with production URL
- [ ] Tested with real ₱50 GCash payment
- [ ] Confirmed QR code generation works
- [ ] Agent system tested end-to-end

## 🔧 Troubleshooting

### Server won't start

- Check if MongoDB is running
- Verify `.env` file exists and has all keys
- Run `npm install` again
- Check port 3000 is not in use

### Payment link not created

- Verify PayMongo keys are correct (no extra spaces)
- Check PAYMONGO*SECRET_KEY starts with `sk_test*`or`sk*live*`
- Look at server console for error messages
- Test keys in PayMongo dashboard API explorer

### Payment not verified

- Wait 10-15 seconds after payment
- Refresh the success page
- Check PayMongo dashboard for payment status
- Check server logs for verification errors

### QR code not showing

- Open browser developer console (F12)
- Check for JavaScript errors
- Verify payment reference in URL (?ref=link_xxx)
- Check if pin was created in database

### Map not loading

- Check internet connection
- Allow location permissions in browser
- Try clicking the "Drop a Pin" button
- Check browser console for errors

## 📞 Need Help?

1. Check server logs in terminal
2. Check browser console (F12) for errors
3. Review TESTING.md for detailed steps
4. Check PayMongo dashboard for payment status
5. Verify all environment variables are set correctly

## 🎉 Success!

When you can:

- ✅ Drop a pin on the map
- ✅ Click "Pay ₱50"
- ✅ Complete payment
- ✅ See QR code with coordinates
- ✅ Download the QR code

**Your PinMyPlace app is working perfectly!** 🚀

---

Ready to go live? See README.md for production deployment checklist.
