#!/bin/bash
# Deploy backend to AWS Lambda

echo "🚀 Deploying backend to AWS Lambda..."

cd backend
npm run deploy

echo "✅ Backend deployed!"
echo "📝 API endpoint will be shown above"
