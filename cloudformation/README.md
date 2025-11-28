# CloudFormation Infrastructure

This CloudFormation template creates all the AWS resources needed for the Domino Score Counter app.

## What Gets Created

### Networking:
- **VPC** with public and private subnets across 2 AZs
- **Internet Gateway** for public internet access
- **NAT Gateway** for Lambda to access internet
- **Route Tables** for public and private subnets

### Security:
- **Security Groups** for Lambda and RDS
- **IAM Role** for Lambda with necessary permissions
- **Secrets Manager** secret for database credentials

### Compute:
- **Lambda Function** (placeholder - will be updated by Serverless Framework)
- **API Gateway HTTP API** with CORS configured

### Database:
- **RDS PostgreSQL** (t3.micro - free tier eligible)
- **DB Subnet Group** in private subnets
- Automated backups enabled

### Storage:
- **S3 Bucket** for frontend hosting
- Static website hosting enabled
- Public read access configured

## Prerequisites

1. **AWS CLI** installed and configured
2. **AWS Account** with appropriate permissions
3. **Unique S3 bucket name** (globally unique across all AWS)

## Prerequisites

1. **AWS CLI** installed and configured:
   ```bash
   # Install AWS CLI
   # Windows: Download from https://aws.amazon.com/cli/
   
   # Configure credentials
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)
   ```

2. **Serverless Framework** installed:
   ```bash
   npm install -g serverless
   serverless --version
   ```

## Deployment

### Step 1: Deploy Infrastructure (CloudFormation) - REQUIRED FIRST!

⚠️ **Important:** Deploy CloudFormation BEFORE using `sls deploy`

```bash
cd cloudformation
bash deploy.sh
```

You'll be prompted for:
- Database password (min 8 characters)
- S3 bucket name (must be globally unique)

**Time:** ~15-20 minutes (RDS takes the longest)

**What this creates:**
- VPC, subnets, security groups
- RDS PostgreSQL database
- IAM roles for Lambda
- S3 bucket for frontend
- API Gateway (placeholder)

### Step 2: Install Backend Dependencies

```bash
cd ../backend
npm install
```

### Step 3: Run Database Migrations

Get the database endpoint:

```bash
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
  --output text
```

Update your `backend/.env`:
```bash
DATABASE_URL=postgresql://dominoadmin:YOUR_PASSWORD@RDS_ENDPOINT:5432/dominodb
```

Run migrations:
```bash
npm run migrate
```

### Step 4: Deploy Backend Code (Serverless)

⚠️ **Only run this AFTER CloudFormation is deployed!**

```bash
# Build TypeScript
npm run build

# Deploy Lambda code with Serverless Framework
sls deploy

# Or use the npm script
npm run deploy
```

**Time:** ~2-3 minutes

**What this does:**
- Packages your Lambda function code
- Uploads to S3
- Updates Lambda function
- Configures API Gateway routes
- Uses VPC/RDS from CloudFormation stack

### Step 5: Deploy Frontend

Get the API endpoint:
```bash
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

Update root `.env`:
```bash
VITE_API_URL=https://your-api-endpoint.amazonaws.com/dev/api
```

Build and deploy:
```bash
cd ..
npm run build

# Option 1: Use deployment script (recommended)
bash deploy-frontend.sh

# Option 2: Manual deployment
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 sync dist/ s3://$BUCKET --delete

# Invalidate CloudFront cache (important!)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

**Time:** ~1-2 minutes (cache invalidation takes 1-2 min to propagate)

**Access your site:**
- **CloudFront (HTTPS):** https://d1234567890.cloudfront.net (recommended)
- **S3 Direct (HTTP):** http://bucket-name.s3-website-us-east-1.amazonaws.com

## Deployment Order Summary

```
1. CloudFormation (infrastructure) ← FIRST!
   ↓
2. Database migrations
   ↓
3. Serverless (Lambda code)
   ↓
4. Frontend (S3)
```

**Why this order?**
- CloudFormation creates VPC, RDS, IAM roles
- Serverless needs these resources to exist
- Frontend needs API endpoint from Serverless

## Quick Commands

```bash
# Initial deployment (run once)
cd cloudformation && bash deploy.sh
cd ../backend && npm install && npm run migrate && npm run deploy
cd .. && npm run build && aws s3 sync dist/ s3://YOUR_BUCKET

# Update backend code only
cd backend && npm run deploy

# Update frontend only
npm run build && aws s3 sync dist/ s3://YOUR_BUCKET

# View logs
cd backend && sls logs -f api -t

# Check error reports
cd backend && bash check-errors.sh
```

## Stack Outputs

After deployment, you'll get:

- **ApiEndpoint**: Your backend API URL
- **FrontendWebsiteURL**: Your frontend website URL
- **RDSEndpoint**: Database endpoint
- **DBSecretArn**: ARN of database credentials in Secrets Manager

## CloudFront Benefits

**Why CloudFront is included:**
- ✅ **HTTPS/SSL** - Secure connections (required for modern browsers)
- ✅ **Fast** - CDN caching, content served from edge locations
- ✅ **Cheap** - Reduces S3 requests, often cheaper than S3 direct
- ✅ **Custom domain** - Easy to add yourdomain.com
- ✅ **Compression** - Automatic gzip/brotli compression
- ✅ **DDoS protection** - AWS Shield Standard included

**CloudFront vs S3 Direct:**
| Feature | S3 Direct | CloudFront |
|---------|-----------|------------|
| HTTPS | ❌ No | ✅ Yes |
| Custom Domain | ❌ Hard | ✅ Easy |
| Speed | Slower | ✅ Faster |
| Cost | ~$0.01/mo | ✅ Free tier |

## Cost Estimate

### Free Tier (12 months):
- VPC: Free
- Lambda: 1M requests/month free
- API Gateway: 1M requests/month free
- RDS t3.micro: 750 hours/month free
- S3: 5GB storage free
- **CloudFront: 1TB data transfer free** ✅

**Total during free tier: $0/month** ✅

### After Free Tier:
- RDS: ~$15/month
- Lambda: ~$0.20/month
- API Gateway: ~$0.035/month
- S3: ~$0.10/month
- CloudFront: ~$0.085/GB (after 1TB)

**Total: ~$15/month** (CloudFront likely free for your usage)

**Note:** NAT Gateway removed to save $32/month. Email notifications disabled, but error reports are saved to database for manual review.

### Cost Optimization:

**Option 1: Remove NAT Gateway** (saves $32/month)
- Lambda won't have internet access
- Can't call external APIs (like SendGrid)
- Database access still works

**Option 2: Use VPC Endpoints** (saves ~$20/month)
- Add VPC endpoints for AWS services
- Reduces NAT Gateway usage

**Option 3: Use Aurora Serverless v2** (variable cost)
- Only pay when database is active
- Can scale to zero
- More expensive per hour, but cheaper if not always running

## Updating the Stack

To update infrastructure:

```bash
cd cloudformation
aws cloudformation deploy \
  --template-file infrastructure.yml \
  --stack-name domino-app-dev \
  --capabilities CAPABILITY_NAMED_IAM
```

## Deleting the Stack

⚠️ **Warning:** This will delete all resources including the database!

```bash
# Delete S3 bucket contents first
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)
aws s3 rm s3://$BUCKET --recursive

# Delete stack
aws cloudformation delete-stack --stack-name domino-app-dev

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name domino-app-dev
```

## Troubleshooting

### Stack creation fails
- Check CloudFormation events in AWS Console
- Common issues:
  - S3 bucket name already taken
  - Insufficient permissions
  - Region doesn't support t3.micro

### Lambda can't connect to RDS
- Check security groups allow traffic
- Check Lambda is in correct subnets
- Check RDS is in same VPC

### Frontend can't reach API
- Check CORS configuration
- Check API Gateway endpoint is correct
- Check Lambda function is deployed

## Monitoring

### View Lambda Logs
```bash
aws logs tail /aws/lambda/domino-app-dev-api --follow
```

### Check Error Reports
Users can manually correct detection errors in the app. These are saved to the database for you to review:

```bash
# Quick check
cd backend
bash check-errors.sh

# Or connect directly
psql -h YOUR_RDS_ENDPOINT -U dominoadmin -d dominodb
SELECT * FROM error_reports WHERE processed = false;
```

Error reports help you:
- See if the detection model needs improvement
- Identify common detection failures
- Collect training data for model retraining

## Security Notes

- Database is in private subnets (not publicly accessible)
- Database credentials stored in Secrets Manager
- Lambda has minimal IAM permissions
- S3 bucket allows public read (required for static hosting)
- API Gateway has CORS enabled (adjust for production)

## Adding a Custom Domain (Optional)

To use your own domain (e.g., dominoes.yourdomain.com):

### Step 1: Get SSL Certificate

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --domain-name dominoes.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### Step 2: Validate Certificate

- Go to AWS Console → Certificate Manager
- Add the DNS validation record to your domain's DNS

### Step 3: Update CloudFormation Template

Uncomment these lines in `infrastructure.yml`:

```yaml
Aliases:
  - dominoes.yourdomain.com
ViewerCertificate:
  AcmCertificateArn: arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT_ID
  SslSupportMethod: sni-only
  MinimumProtocolVersion: TLSv1.2_2021
```

### Step 4: Update Stack

```bash
aws cloudformation deploy \
  --template-file infrastructure.yml \
  --stack-name domino-app-dev \
  --capabilities CAPABILITY_NAMED_IAM
```

### Step 5: Add DNS Record

Add a CNAME record in your DNS:
```
dominoes.yourdomain.com → d1234567890.cloudfront.net
```

**Done!** Your app is now at https://dominoes.yourdomain.com

## Next Steps

1. ✅ Custom domain (see above)
2. Set up CloudWatch alarms
3. Configure backup retention
4. Set up CI/CD pipeline (GitHub Actions)
5. Add monitoring and analytics
