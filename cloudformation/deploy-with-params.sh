#!/bin/bash
# Deploy CloudFormation infrastructure using parameters.json

STACK_NAME="domino-app-dev"
TEMPLATE_FILE="infrastructure.yml"
REGION="us-east-1"

echo "🚀 Deploying CloudFormation stack: $STACK_NAME"
echo "📋 Using parameters from parameters.json"

# Check if parameters.json exists
if [ ! -f "parameters.json" ]; then
  echo "❌ parameters.json not found!"
  echo "Please create parameters.json with your password and bucket name"
  exit 1
fi

# Deploy stack
aws cloudformation deploy \
  --template-file $TEMPLATE_FILE \
  --stack-name $STACK_NAME \
  --parameter-overrides file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM \
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
else
  echo "❌ CloudFormation deployment failed"
  exit 1
fi
