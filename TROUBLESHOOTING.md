# ⚠️ Quick Fix - Common Errors

## Error: "checkExistingSession is not defined"

**✅ FIXED** - Removed legacy authentication code from utils.js

The pay-per-pin model doesn't require login on the main page, so this function call has been removed.

---

## Error: "Payment system not configured"

**Cause:** Missing PayMongo API keys in `.env` file

**Solution:**

1. Make sure you have a `.env` file in the project root
2. Add your PayMongo keys:

```env
PAYMONGO_SECRET_KEY=sk_test_your_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
```

3. Get keys from: https://dashboard.paymongo.com/developers/api-keys
4. Restart the server: `npm run dev`

---

## Error: "Port 3000 already in use"

**Cause:** Another instance of the server is running

**Solution:**

**Option 1 - Kill the process:**

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess | Get-Unique | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Option 2 - Use different port:**
Add to `.env`:

```env
PORT=3001
```

---

## Error: "Failed to load resource: ERR_NAME_NOT_RESOLVED"

**Cause:** Images or resources referenced that don't exist

**Solution:** These are just warnings and won't affect functionality. Ignore them or check your image paths.

---

## Error: "500 Internal Server Error" on /api/pin/initiate-payment

**Possible Causes:**

1. **Missing PayMongo keys** (most common)

   - Check `.env` file exists
   - Verify keys are correct (no extra spaces)
   - Keys should start with `sk_test_` or `sk_live_`

2. **MongoDB not connected**

   - Check MONGODB_URI in `.env`
   - Verify MongoDB is running
   - Check server console for connection errors

3. **Missing required fields**
   - Location name must be filled
   - Phone number must be entered
   - Map pin must be dropped

**Debug Steps:**

1. Open browser developer console (F12)
2. Look at Network tab
3. Click on failed request
4. Check Response tab for error details
5. Check server terminal for error logs

---

## How to Verify Everything is Working

1. **Check .env file exists:**

   ```powershell
   Test-Path .env
   ```

2. **Start server and watch for errors:**

   ```powershell
   npm run dev
   ```

3. **Look for these success messages:**

   ```
   ✅ MongoDB connected successfully
   🚀 Server running on port 3000
   ```

4. **Test in browser:**
   - Open http://localhost:3000
   - Open DevTools Console (F12)
   - Look for: "PinMyPlace initialized - Pay Per Pin Mode"
   - Should see library check marks (✅)

---

## Still Having Issues?

1. **Check server logs** in the terminal running `npm run dev`
2. **Check browser console** (F12) for JavaScript errors
3. **Verify all environment variables** in `.env`
4. **Try restarting** the server
5. **Review** [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md)

---

## Quick Test Checklist

- [ ] `.env` file exists with all keys
- [ ] MongoDB is running and connected
- [ ] Server starts without errors on port 3000
- [ ] Browser console shows "PinMyPlace initialized"
- [ ] No errors about missing libraries
- [ ] Can drop a pin on the map
- [ ] Payment button shows "Pay ₱50 via GCash Now"
