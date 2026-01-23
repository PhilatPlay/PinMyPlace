# AWS Deployment Steps - Quick Guide

## 📋 Prerequisites Installation

### 1. Install AWS CLI (Required)
- Download: https://awscli.amazonaws.com/AWSCLIV2.msi
- Run installer
- Restart PowerShell after installation
- Verify: `aws --version`

### 2. Install Python 3 (Required for EB CLI)
- Download: https://www.python.org/downloads/
- **IMPORTANT**: Check "Add Python to PATH" during installation
- Restart PowerShell after installation
- Verify: `python --version`
- Verify: `pip --version`

### 3. Install EB CLI
```powershell
pip install awsebcli --upgrade
```
- Verify: `eb --version`

---

## 🔑 Step-by-Step Deployment

### Step 1: Configure AWS Credentials

```powershell
aws configure
```

You'll need:
- **AWS Access Key ID**: Get from AWS Console > IAM > Users > Security Credentials
- **AWS Secret Access Key**: From same place
- **Default region**: Choose one:
  - `ap-southeast-1` (Singapore - best for Philippines)
  - `us-east-1` (Virginia - good for global)
  - `sa-east-1` (São Paulo - for Ecuador trial)
- **Default output format**: `json`

### Step 2: Prepare Environment Variables

Create a file with your production values (don't commit this!):

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
MONGODB_URI=your-mongodb-atlas-connection-string
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
XENDIT_SECRET_KEY=your-xendit-secret-key
PAYMONGO_SECRET_KEY=your-paymongo-secret-key
TRIAL_CODE=your-ecuador-trial-code
PORT=3000
```

### Step 3: Initialize Elastic Beanstalk

```powershell
cd C:\projects\droplogik_GeoCode\PinMyPlace
eb init
```

Answer the prompts:
- **Region**: `ap-southeast-1` (Singapore) - recommended for Philippines
- **Application name**: `pinmyplace`
- **Platform**: `Node.js`
- **Platform version**: `Node.js 18 running on 64bit Amazon Linux 2023`
- **Set up SSH**: `y` (recommended for debugging)

### Step 4: Create Environment

```powershell
eb create pinmyplace-production --instance-type t3.small
```

This will:
- Create EC2 instance
- Set up load balancer
- Configure security groups
- Deploy your application

### Step 5: Set Environment Variables

```powershell
eb setenv NODE_ENV=production JWT_SECRET=your-jwt-secret MONGODB_URI=your-mongodb-uri STRIPE_SECRET_KEY=your-stripe-key STRIPE_PUBLISHABLE_KEY=your-stripe-pub-key XENDIT_SECRET_KEY=your-xendit-key PAYMONGO_SECRET_KEY=your-paymongo-key PORT=3000
```

Replace with your actual values!

### Step 6: Deploy

```powershell
eb deploy
```

### Step 7: Open Your Application

```powershell
eb open
```

This opens your app in the browser!

---

## 🗄️ MongoDB Atlas Setup (Required)

You need a MongoDB database. AWS doesn't provide MongoDB, so use MongoDB Atlas:

### 1. Create Atlas Account
- Go to: https://www.mongodb.com/cloud/atlas
- Sign up (free tier available)

### 2. Create Cluster
- Click "Create Cluster"
- Choose **AWS** as cloud provider
- Choose **Singapore (ap-southeast-1)** - same region as your app
- Choose **M0 Free Tier** for testing or **M10** for production

### 3. Create Database User
- Go to Database Access
- Add New Database User
- Username: `pinmyplace`
- Password: Generate strong password (save this!)

### 4. Configure Network Access
- Go to Network Access
- Add IP Address: `0.0.0.0/0` (allows from anywhere)
  - For production, restrict to your AWS IPs

### 5. Get Connection String
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- Replace `<password>` with your database password
- Should look like: `mongodb+srv://pinmyplace:yourpassword@cluster0.xxxxx.mongodb.net/pinmyplace?retryWrites=true&w=majority`

### 6. Update AWS Environment
```powershell
eb setenv MONGODB_URI="mongodb+srv://pinmyplace:yourpassword@cluster0.xxxxx.mongodb.net/pinmyplace?retryWrites=true&w=majority"
```

---

## 🔍 Monitoring & Debugging

### Check Application Status
```powershell
eb status
```

### View Logs
```powershell
eb logs
```

### SSH Into Server (if needed)
```powershell
eb ssh
```

### Check Environment Health
```powershell
eb health
```

---

## 💰 Cost Estimate

### AWS Elastic Beanstalk (t3.small)
- EC2 Instance: ~$15/month
- Load Balancer: ~$18/month
- **Total: ~$35-40/month**

### MongoDB Atlas
- Free Tier (M0): $0/month - 512MB storage
- Shared M2: $9/month - 2GB storage
- Dedicated M10: $57/month - 10GB storage

### Total Monthly Cost
- **Development/Testing**: $35-40/month (with free MongoDB)
- **Production**: $95-100/month (with M10 MongoDB)

---

## ⚠️ Important Notes

1. **Don't commit** `.env` files or credentials to Git
2. **Set up MongoDB Atlas** before deploying
3. **Test payment providers** work in production
4. **Enable HTTPS** - already configured in `.ebextensions`
5. **Monitor costs** in AWS Console

---

## 🆘 If Something Goes Wrong

### Application won't start
```powershell
eb logs
```
Look for errors in the logs

### Can't connect to MongoDB
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify connection string is correct
- Check username/password

### Payment providers not working
- Verify all secret keys are set correctly
- Check if keys are for production (not test mode)

---

## 📞 Next Steps After Deployment

1. Get your application URL from `eb status`
2. Update payment provider webhooks to point to your AWS URL
3. Test all functionality:
   - Pin creation
   - Payment with access codes
   - Bulk purchases
   - Trial codes
4. Set up custom domain (optional)
5. Monitor logs and costs

---

## 🎯 Quick Commands Reference

```powershell
# Deploy changes
eb deploy

# Check status
eb status

# View logs
eb logs

# Open in browser
eb open

# SSH into server
eb ssh

# Scale instances
eb scale 2

# Terminate environment (careful!)
eb terminate pinmyplace-production
```

---

Ready to deploy? Start with installing the prerequisites, then run through steps 1-7!
