#!/bin/bash
# Quick script to check error reports from the database

# Get database credentials from CloudFormation
STACK_NAME="domino-app-dev"

echo "📊 Fetching error reports from database..."

# Get RDS endpoint
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSEndpoint`].OutputValue' \
  --output text)

# Get database credentials from Secrets Manager
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query 'Stacks[0].Outputs[?OutputKey==`DBSecretArn`].OutputValue' \
  --output text)

DB_CREDS=$(aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --query SecretString \
  --output text)

DB_USER=$(echo $DB_CREDS | jq -r .username)
DB_PASS=$(echo $DB_CREDS | jq -r .password)
DB_NAME=$(echo $DB_CREDS | jq -r .dbname)

# Connect and run query
echo ""
echo "=== Unprocessed Error Reports ==="
PGPASSWORD=$DB_PASS psql -h $RDS_ENDPOINT -U $DB_USER -d $DB_NAME -c "
SELECT 
    id,
    user_id,
    detected_score,
    corrected_score,
    (corrected_score - detected_score) as difference,
    created_at
FROM error_reports
WHERE processed = false
ORDER BY created_at DESC
LIMIT 20;
"

echo ""
echo "=== Error Report Summary ==="
PGPASSWORD=$DB_PASS psql -h $RDS_ENDPOINT -U $DB_USER -d $DB_NAME -c "
SELECT 
    COUNT(*) as total_reports,
    COUNT(CASE WHEN processed = false THEN 1 END) as unprocessed,
    AVG(ABS(detected_score - corrected_score)) as avg_correction
FROM error_reports;
"

echo ""
echo "💡 To mark reports as processed, run:"
echo "   psql -h $RDS_ENDPOINT -U $DB_USER -d $DB_NAME"
echo "   UPDATE error_reports SET processed = true WHERE id IN (1,2,3);"
