# Quick Deployment Guide

## First Time Setup (Only Once)

### Check if CloudFormation Stack Exists

```bash
aws cloudformation describe-stacks --stack-name domino-app-dev
```

If you get an error "Stack with id domino-app-dev does not exist", continue with Step 0.

If it shows stack details, **skip to Step 1** below.

### Step 0: Deploy Infrastructure (First Time Only - Takes 15-20 min)

```bash
cd cloudformation
bash deploy.sh
```

You'll be prompted for:
- **Database password**: Choose a secure password (min 8 characters)
- **S3 bucket name**: Must be globally unique (e.g., `domino-app-yourname-2024`)

This creates:
- S3 bucket for your frontend
- CloudFront CDN (HTTPS)
- RDS database
- Lambda functions
- API Gateway

**Wait for it to complete** (15-20 minutes). Then continue to Step 1.

---

## Deploy Frontend Updates

### Step 1: Build the Frontend

```bash
npm run build
```

## Step 2: Get Your S3 Bucket Name

```bash
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text
```

Save this bucket name!

## Step 3: Get Your CloudFront Distribution ID

```bash
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text
```

Save this distribution ID!

## Step 4: Upload to S3

Replace `YOUR_BUCKET_NAME` with the bucket name from Step 2:

```bash
aws s3 sync dist/ s3://YOUR_BUCKET_NAME --delete
```

## Step 5: Invalidate CloudFront Cache

Replace `YOUR_DISTRIBUTION_ID` with the ID from Step 3:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Step 6: Get Your App URL

```bash
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text
```

Open this URL on your phone! It will be an HTTPS URL like: `https://d1234567890.cloudfront.net`

---

## One-Line Deploy (After First Time)

Once you know your bucket and distribution ID:

```bash
npm run build && \
aws s3 sync dist/ s3://YOUR_BUCKET_NAME --delete && \
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Troubleshooting

### "aws: command not found"
Make sure AWS CLI is in your PATH. In Git Bash:
```bash
export PATH=$PATH:/c/Program\ Files/Amazon/AWSCLIV2
```

### Check if stack exists
```bash
aws cloudformation describe-stacks --stack-name domino-app-dev
```

If it doesn't exist, deploy infrastructure first:
```bash
cd cloudformation
bash deploy.sh
```

### Backend not working?
You may need to deploy the backend Lambda code:
```bash
cd backend
npm install
npm run build
npm run deploy
```
