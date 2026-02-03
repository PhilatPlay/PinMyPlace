# 🚀 Quick Start Checklist

## ✅ Prerequisites Installed

- [ ] Node.js v18 or higher installed
- [ ] MongoDB running (local or Atlas cloud)
- [ ] Git installed (optional)

## 🔑 Stripe Account Setup

- [ ] Created account at https://dashboard.stripe.com
- [ ] Verified email address
- [ ] Completed business verification (for live payments)
- [ ] Located API keys in Developers > API Keys
- [ ] Copied test secret key (sk_test_...)
- [ ] Copied test publishable key (pk_test_...)

## 📁 Project Setup

- [ ] Cloned/downloaded project
- [ ] Ran `npm install`
- [ ] Created `.env` file in root directory
- [ ] Added MongoDB connection string to `.env`
- [ ] Added JWT_SECRET to `.env` (any random string)
- [ ] Added STRIPE_SECRET_KEY to `.env`

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

- [ ] Clicked "Pay ₱100 via GCash Now"
- [ ] Redirected to Stripe payment page
- [ ] Used test card 4242 4242 4242 4242
- [ ] Completed test payment
- [ ] Redirected back to success page
- [ ] QR code displayed with coordinates
- [ ] Can download QR code image

## 👥 Agent Testing (Optional)

- [ ] Created agent account via API or interface
- [ ] Logged in as agent
- [ ] Dashboard shows with stats
- [ ] Created pin while logged in as agent
- [ ] Commission tracked correctly (₱50)

## 🌐 Production Preparation (When Ready)

- [ ] Switched to live Stripe keys (sk_live_... and pk_live_...)
- [ ] Configured production MongoDB database
- [ ] Set up domain name
- [ ] SSL certificate installed (HTTPS)
- [ ] Environment variables set on hosting platform
- [ ] Stripe webhooks configured with production URL
- [ ] Tested with real payment
- [ ] Confirmed QR code generation works
- [ ] Agent system tested end-to-end

## 🔧 Troubleshooting

### Server won't start

- Check if MongoDB is running
- Verify `.env` file exists and has all keys
- Run `npm install` again
- Check port 3000 is not in use

### Payment link not created

- Verify Stripe keys are correct (no extra spaces)
- Check STRIPE_SECRET_KEY starts with `sk_test_` or `sk_live_`
- Look at server console for error messages
- Test keys in Stripe dashboard API explorer

### Payment not verified

- Wait 10-15 seconds after payment
- Refresh the success page
- Check Stripe dashboard for payment status
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
- ✅ Click "Pay ₱100"
- ✅ Complete payment
- ✅ See QR code with coordinates
- ✅ Download the QR code

**Your PinMyPlace app is working perfectly!** 🚀

---

Ready to go live? See README.md for production deployment checklist.
