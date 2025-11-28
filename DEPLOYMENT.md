# Deployment Guide

This guide shows you how to deploy the Domino Score Counter app to AWS using serverless architecture.

## Architecture

- **Frontend**: S3 + CloudFront (static hosting)
- **Backend**: Lambda + API Gateway (serverless)
- **Database**: RDS PostgreSQL or DynamoDB

## Prerequisites

1. **AWS Account** - Sign up at https://aws.amazon.com
2. **AWS CLI** - Install and configure:
   ```bash
   # Install AWS CLI
   # Windows: Download from https://aws.amazon.com/cli/
   # Mac: brew install awscli
   # Linux: apt-get install awscli
   
   # Configure with your credentials
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
   ```

3. **Node.js & npm** - Already installed ✅

## Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

Create `backend/.env` for local development:
```bash
DATABASE_URL=your_database_url_here
SENDGRID_API_KEY=your_sendgrid_key (optional)
DEVELOPER_EMAIL=your_email (optional)
FROM_EMAIL=noreply@yourdomain.com (optional)
```

For production, set these in AWS Systems Manager Parameter Store or Lambda environment variables.

## Deployment

### Deploy Backend (Lambda)

```bash
# Option 1: Using the script
bash deploy-backend.sh

# Option 2: Manual
cd backend
npm run build
serverless deploy

# For production
npm run deploy:prod
```

**Output:** You'll get an API endpoint like:
```
https://abc123.execute-api.us-east-1.amazonaws.com/dev
```

### Deploy Frontend (S3)

1. **Update API URL** in `.env`:
   ```bash
   VITE_API_URL=https://your-api-endpoint.amazonaws.com/dev/api
   ```

2. **Deploy:**
   ```bash
   # Option 1: Using the script (edit bucket name first!)
   bash deploy-frontend.sh
   
   # Option 2: Manual
   npm run build
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

**Output:** You'll get a website URL like:
```
http://domino-app-frontend.s3-website-us-east-1.amazonaws.com
```

## Database Setup

### Option A: RDS PostgreSQL (Recommended for PostgreSQL)

1. **Create RDS instance** (t3.micro for free tier):
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier domino-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password YourPassword123 \
     --allocated-storage 20
   ```

2. **Get connection string** and update Lambda environment variables

3. **Run migrations:**
   ```bash
   cd backend
   npm run migrate
   ```

### Option B: DynamoDB (Free Forever)

1. **Create tables** (handled by serverless.yml if configured)
2. **Refactor code** to use DynamoDB instead of PostgreSQL

## Local Development

### Run Backend Locally with Serverless Offline

```bash
cd backend
npm run dev:serverless
```

This runs Lambda locally at `http://localhost:3001`

### Run Frontend Locally

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

## Deployment Commands Summary

```bash
# Deploy backend only
cd backend && npm run deploy

# Deploy frontend only
npm run build && aws s3 sync dist/ s3://your-bucket

# Deploy both
bash deploy-backend.sh && bash deploy-frontend.sh

# View backend logs
cd backend && npm run logs
```

## Cost Estimate

### Free Tier (12 months):
- Lambda: 1M requests/month FREE
- API Gateway: 1M requests/month FREE
- S3: 5GB storage, 20k requests FREE
- RDS t3.micro: 750 hours/month FREE

**Your usage (10 friends):** ~10k requests/month = **$0/month**

### After Free Tier:
- Lambda: ~$0.20/month
- API Gateway: ~$0.035/month
- S3: ~$0.10/month
- RDS: ~$15/month (or use DynamoDB for free)

**Total: ~$15/month** (or ~$0.50/month with DynamoDB)

## Troubleshooting

### Backend won't deploy
- Check AWS credentials: `aws sts get-caller-identity`
- Check serverless is installed: `serverless --version`
- Check build succeeded: `cd backend && npm run build`

### Frontend won't load
- Check CORS settings in backend
- Check API URL in `.env`
- Check S3 bucket policy allows public read

### Database connection fails
- Check security groups allow Lambda to access RDS
- Check DATABASE_URL is correct
- Check VPC configuration in serverless.yml

## Next Steps

1. **Custom Domain**: Set up Route 53 + CloudFront
2. **HTTPS**: Add SSL certificate via ACM
3. **CI/CD**: Set up GitHub Actions for auto-deploy
4. **Monitoring**: Enable CloudWatch logs and alarms

## Useful Commands

```bash
# View Lambda logs
serverless logs -f api -t

# Remove deployment
serverless remove

# Deploy specific stage
serverless deploy --stage prod

# Invoke function locally
serverless invoke local -f api

# Check AWS resources
aws lambda list-functions
aws s3 ls
```

## Support

- AWS Documentation: https://docs.aws.amazon.com
- Serverless Framework: https://www.serverless.com/framework/docs
- Issues: Check CloudWatch logs for errors
