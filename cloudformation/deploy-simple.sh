#!/bin/bash
# Deploy simplified CloudFormation infrastructure (frontend only, no database)

STACK_NAME="domino-app-dev"
TEMPLATE_FILE="infrastructure-simple.yml"
REGION="us-east-1"

echo "🚀 Deploying simplified CloudFormation stack: $STACK_NAME"
echo "⚠️  Note: This deploys frontend only (no database/backend)"
echo ""

# Prompt for S3 bucket name
read -p "Enter S3 bucket name for frontend (must be globally unique): " BUCKET_NAME

# Deploy stack
aws cloudformation deploy \
  --template-file $TEMPLATE_FILE \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=dev \
    FrontendBucketName=$BUCKET_NAME \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✅ CloudFormation stack deployed successfully!"
  echo ""
  echo "📋 Getting stack outputs..."
  aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    --output table
  
  echo ""
  echo "🎉 Your app will work in offline mode (local storage only)"
  echo "📱 Deploy frontend now with: cd .. && npm run build && bash deploy-frontend.sh"
else
  echo "❌ CloudFormation deployment failed"
  exit 1
fi
