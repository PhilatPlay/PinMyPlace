# Ecuador Trial System - Setup Guide

## Overview
Trial system for offering limited-time access to dropLogik for potential enterprise customers like Ecuador Postal Service.

## Implementation Summary

### 1. Files Created/Modified

**New Files:**
- `models/TrialCode.js` - Trial code data model
- `routes/trial.js` - Trial routes and validation
- `public/ecuador-trial.html` - Ecuador-branded trial page

**Modified Files:**
- `routes/pin.js` - Added `/create-with-trial` endpoint
- `server.js` - Registered trial routes

### 2. How It Works

1. **Trial Code Document** - Manually insert into MongoDB
2. **Branded Page** - Users access `/trial/ecuador-trial`
3. **Code Validation** - Users enter trial code
4. **Pin Creation** - Pins created with `redeemedCode` field
5. **Usage Tracking** - Auto-increments usage count

### 3. Creating a Trial Code

Use MongoDB shell or Compass to insert:

```javascript
db.trialcodes.insertOne({
  code: "ECUADOR-TRIAL-2026",
  trialName: "Ecuador Postal Service Trial",
  description: "90-day trial for Ecuador Postal Service",
  maxUses: 1000,              // null for unlimited
  usedCount: 0,
  expiresAt: new Date("2026-04-15"),  // null for no expiration
  active: true,
  createdAt: new Date()
})
```

### 4. Trial Page URLs

- Ecuador: `https://yourdomain.com/trial/ecuador-trial`
- Add more in `routes/trial.js` trialConfigs object

### 5. Managing Trials

**Find all trial pins:**
```javascript
db.pins.find({ redeemedCode: "ECUADOR-TRIAL-2026" })
```

**Count usage:**
```javascript
db.pins.count({ redeemedCode: "ECUADOR-TRIAL-2026" })
```

**Check trial code status:**
```javascript
db.trialcodes.findOne({ code: "ECUADOR-TRIAL-2026" })
```

**Disable trial code:**
```javascript
db.trialcodes.updateOne(
  { code: "ECUADOR-TRIAL-2026" },
  { $set: { active: false } }
)
```

**Extend expiration:**
```javascript
db.trialcodes.updateOne(
  { code: "ECUADOR-TRIAL-2026" },
  { $set: { expiresAt: new Date("2026-06-30") } }
)
```

**Increase usage limit:**
```javascript
db.trialcodes.updateOne(
  { code: "ECUADOR-TRIAL-2026" },
  { $set: { maxUses: 2000 } }
)
```

### 6. Analytics Queries

**Recent trial activity:**
```javascript
db.pins.find({ redeemedCode: "ECUADOR-TRIAL-2026" })
  .sort({ createdAt: -1 })
  .limit(20)
```

**Usage by date:**
```javascript
db.pins.aggregate([
  { $match: { redeemedCode: "ECUADOR-TRIAL-2026" } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
])
```

**Unique phone numbers (unique users):**
```javascript
db.pins.distinct("customerPhone", { redeemedCode: "ECUADOR-TRIAL-2026" }).length
```

### 7. Adding More Trials

Edit `routes/trial.js` and add to `trialConfigs`:

```javascript
const trialConfigs = {
  'ecuador-trial': { /* ... */ },
  'colombia-trial': {
    name: 'Colombia Postal Service Trial',
    colors: {
      primary: '#FCD116',    // Yellow
      secondary: '#003893',  // Blue
      accent: '#CE1126'      // Red
    },
    htmlFile: 'colombia-trial.html'
  }
}
```

Then create the corresponding HTML file.

### 8. Trial Code Features

- **Usage Limits** - Automatically enforced (maxUses)
- **Expiration** - Time-based access control
- **Active/Inactive** - Quick on/off switch
- **Usage Tracking** - Count and timestamp
- **No Payment** - Pins created without payment gateway

### 9. Trial Pin Data

Trial pins contain all location data:
- GPS coordinates
- Address/landmarks
- Phone numbers
- Creation timestamps

Only difference: `redeemedCode` field instead of payment record.

### 10. Security Notes

- Rate limiting applied (same as bulk codes)
- Input validation on all fields
- Trial codes are case-insensitive
- Codes stored uppercase in database
