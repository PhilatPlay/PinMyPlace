# AWS Deployment Guide for PinMyPlace

## 🌍 Why AWS?

- **Global Coverage**: Multiple regions (US, EU, Asia-Pacific, South America)
- **Lower Latency**: Deploy closer to your users
- **Cost Effective**: Pay for what you use, cheaper at scale
- **Scalability**: Auto-scaling based on traffic
- **Services**: S3 for file storage, RDS for MongoDB Atlas integration

## 🚀 Deployment Options

### Option 1: AWS Elastic Beanstalk (Recommended - Easiest)
### Option 2: AWS ECS/Fargate (Container-based)
### Option 3: AWS EC2 (Manual setup - Most control)

---

## 📦 Option 1: Elastic Beanstalk Deployment

### Prerequisites

1. **Install AWS CLI**
```bash
# Download from: https://aws.amazon.com/cli/
aws --version
```

2. **Install EB CLI**
```bash
pip install awsebcli --upgrade --user
eb --version
```

3. **Configure AWS Credentials**
```bash
aws configure
# Enter:
# AWS Access Key ID
# AWS Secret Access Key
# Default region: ap-southeast-1 (Singapore) or us-east-1 (Virginia)
# Default output format: json
```

### Step 1: Initialize Elastic Beanstalk

```bash
cd C:\projects\droplogik_GeoCode\PinMyPlace
eb init
```

**Configuration prompts:**
- Select region: 
  - `ap-southeast-1` (Singapore - for Asia/Pacific)
  - `us-east-1` (Virginia - for US East Coast)
  - `us-west-2` (Oregon - for US West Coast)
  - `sa-east-1` (São Paulo - for South America)
  - `eu-west-1` (Ireland - for Europe)
- Application name: `pinmyplace`
- Platform: `Node.js`
- Platform version: `Node.js 18 running on 64bit Amazon Linux 2023`
- Set up SSH: `y` (for debugging)

### Step 2: Create Environment

```bash
eb create pinmyplace-production
```

**Or specify options:**
```bash
eb create pinmyplace-production \
  --instance-type t3.small \
  --region ap-southeast-1 \
  --platform "Node.js 18 running on 64bit Amazon Linux 2023"
```

### Step 3: Set Environment Variables

```bash
eb setenv \
  NODE_ENV=production \
  JWT_SECRET=your-super-secret-jwt-key-change-this \
  MONGODB_URI=your-mongodb-atlas-connection-string \
  STRIPE_SECRET_KEY=your-stripe-secret \
  STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key \
  XENDIT_SECRET_KEY=your-xendit-secret \
  PAYMONGO_SECRET_KEY=your-paymongo-secret \
  TRIAL_CODE=your-trial-code
```

### Step 4: Deploy Application

```bash
eb deploy
```

### Step 5: Open Application

```bash
eb open
```

### Step 6: Configure Custom Domain (Optional)

1. Go to AWS Console > Elastic Beanstalk > Your Environment
2. Go to Configuration > Load Balancer
3. Add SSL certificate (use AWS Certificate Manager)
4. Update your domain's DNS to point to the EB URL

### Useful Commands

```bash
# Check environment status
eb status

# View logs
eb logs

# SSH into instance
eb ssh

# Monitor health
eb health

# Scale instances
eb scale 2

# Terminate environment
eb terminate pinmyplace-production
```

---

## 🗄️ MongoDB Setup with Atlas

Since AWS doesn't offer MongoDB directly, use **MongoDB Atlas**:

### Step 1: Create Atlas Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster (or paid for production)
3. Choose AWS as cloud provider
4. Choose same region as your EB deployment (e.g., Singapore)

### Step 2: Configure Network Access

1. In Atlas, go to Network Access
2. Add IP: `0.0.0.0/0` (allow from anywhere)
   - ⚠️ For production, restrict to your EB environment IPs

### Step 3: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string
4. Replace `<password>` with your database password
5. Add to EB environment variables:

```bash
eb setenv MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/pinmyplace?retryWrites=true&w=majority"
```

---

## 💾 File Storage with S3

For storing payment proofs and user uploads:

### Step 1: Create S3 Bucket

```bash
aws s3 mb s3://pinmyplace-uploads --region ap-southeast-1
```

### Step 2: Update Code to Use S3

Install AWS SDK:
```bash
npm install @aws-sdk/client-s3 multer-s3
```

### Step 3: Configure IAM Role

1. Go to AWS IAM Console
2. Create policy with S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::pinmyplace-uploads/*"
  }]
}
```

3. Attach policy to EB instance role

---

## 💰 Cost Estimation

### Elastic Beanstalk (t3.small, 1 instance)
- **EC2 Instance**: ~$15-20/month
- **Load Balancer**: ~$18/month
- **Data Transfer**: ~$0.09/GB
- **Total**: ~$35-50/month (low traffic)

### MongoDB Atlas
- **Free Tier**: 512MB (good for testing)
- **Shared M2**: $9/month (1GB)
- **Dedicated M10**: $57/month (2GB, recommended for production)

### S3 Storage
- **Storage**: $0.023/GB/month
- **Requests**: $0.005 per 1,000 PUT requests
- **Total**: <$5/month for typical usage

### Total Monthly Cost
- **Development**: $0 (free tiers)
- **Small Production**: ~$50-70/month
- **Medium Production**: ~$100-150/month

---

## 📊 Region Recommendations

### For Global Reach
Use CloudFront CDN + Multiple Regions:
- Primary: `ap-southeast-1` (Singapore) - serves Asia/Pacific
- Secondary: `us-east-1` (Virginia) - serves Americas
- Tertiary: `eu-west-1` (Ireland) - serves Europe

### For Philippines Focus
- **Best**: `ap-southeast-1` (Singapore) - ~30ms latency
- **Alternative**: `ap-northeast-1` (Tokyo) - ~50ms latency

### For Ecuador Trial
- **Best**: `sa-east-1` (São Paulo) - ~80ms latency
- **Alternative**: `us-east-1` (Virginia) - ~100ms latency

---

## 🔒 Security Best Practices

### 1. Enable HTTPS Only

```bash
# Already configured in .ebextensions/https-redirect.config
```

### 2. Restrict Security Groups

In AWS Console > EC2 > Security Groups:
- Allow port 443 (HTTPS) from `0.0.0.0/0`
- Allow port 80 (HTTP) from `0.0.0.0/0` (for redirect)
- Allow port 22 (SSH) from your IP only

### 3. Use IAM Roles (Not Access Keys)

Never hardcode AWS credentials. Use EB instance roles.

### 4. Enable CloudWatch Monitoring

```bash
eb config
# Enable Enhanced Health Reporting
```

### 5. Set up Auto-Scaling

In AWS Console > EB > Configuration > Capacity:
- Min instances: 1
- Max instances: 4
- Scaling trigger: CPU > 70%

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to EB
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: pinmyplace
          environment_name: pinmyplace-production
          version_label: ${{ github.sha }}
          region: ap-southeast-1
          deployment_package: deploy.zip
```

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check logs
eb logs

# Common issues:
# 1. Missing environment variables
# 2. MongoDB connection failed
# 3. Node version mismatch
```

### Connection Timeout

```bash
# Check security groups allow traffic
# Check MongoDB Atlas IP whitelist
# Verify MONGODB_URI is correct
```

### File Upload Fails

```bash
# Check nginx body size limit (already configured)
# Verify uploads directory permissions
# Consider switching to S3
```

### High Response Time

```bash
# Enable auto-scaling
# Add CloudFront CDN
# Optimize database queries
# Add Redis caching
```

---

## 📈 Migration from Heroku

### 1. Export Heroku Config

```bash
heroku config -s > heroku.env
```

### 2. Convert to EB Format

```bash
# Review heroku.env and set with:
eb setenv KEY1=value1 KEY2=value2 ...
```

### 3. Export MongoDB Data

```bash
# If using Heroku MongoDB
mongodump --uri="your-heroku-mongodb-uri"
mongorestore --uri="your-atlas-mongodb-uri" dump/
```

### 4. Update DNS

1. Test AWS deployment thoroughly
2. Update your domain's A record to point to EB
3. Wait for DNS propagation (5-30 minutes)
4. Verify new deployment works
5. Shut down Heroku app

---

## 📞 Support

For AWS-specific issues:
- AWS Documentation: https://docs.aws.amazon.com/elasticbeanstalk/
- AWS Support: https://console.aws.amazon.com/support/

For application issues:
- Check application logs: `eb logs`
- SSH into instance: `eb ssh`
- Review CloudWatch metrics in AWS Console
