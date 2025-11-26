# Email Service Setup Guide

This guide explains how to configure the email service for sending error reports when users make manual corrections to domino detection results.

## Overview

When a user manually corrects detection results, the system:
1. Saves the error report to the database
2. Sends an email to the developer with diagnostic information
3. Includes comparison between original detection and corrections

## SendGrid Setup

### 1. Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Create API Key

1. Log in to SendGrid dashboard
2. Go to Settings > API Keys
3. Click "Create API Key"
4. Choose "Full Access" or "Restricted Access" with Mail Send permissions
5. Copy the API key (you won't be able to see it again!)

### 3. Verify Sender Email (Optional but Recommended)

For production use, verify your sender email:
1. Go to Settings > Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in your details and verify the email

### 4. Configure Environment Variables

Add to your `.env` file:

```env
SENDGRID_API_KEY=SG.your_api_key_here
DEVELOPER_EMAIL=your-email@example.com
FROM_EMAIL=noreply@yourdomain.com
```

**Variables:**
- `SENDGRID_API_KEY`: Your SendGrid API key
- `DEVELOPER_EMAIL`: Email address to receive error reports
- `FROM_EMAIL`: Sender email (must be verified in SendGrid for production)

## Testing

### Check Email Configuration Status

```bash
curl http://localhost:3001/api/reports/email-status
```

Response:
```json
{
  "configured": true,
  "message": "Email service is configured and ready"
}
```

### Send Test Email

```bash
curl -X POST http://localhost:3001/api/reports/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "Test email sent to your-email@example.com"
}
```

## Email Content

Error report emails include:

### Report Details
- Report ID
- User ID
- Game ID and Round ID
- Timestamp

### Original Detection
- Number of tiles detected
- Each tile's pip counts and confidence scores
- Total score

### Manual Corrections
- Number of corrected tiles
- Each corrected tile's pip counts
- Corrected total score

### Comparison Table
- Difference in tile count
- Difference in total score

### Image Information
- Image size
- Note about image storage

### Action Items
- Suggestions for improving detection algorithm
- Areas to investigate

## Error Handling

The email service is designed to be resilient:

- If email is not configured, reports are still saved to the database
- If email sending fails, the error is logged but doesn't affect the user
- Failed emails don't prevent the error report from being stored
- Reports can be retrieved later via `/api/reports/unprocessed`

## Production Considerations

### Security
- Keep your SendGrid API key secret
- Use environment variables, never commit keys to git
- Rotate API keys periodically
- Use restricted access keys with minimal permissions

### Sender Verification
- Verify your sender email in SendGrid
- Use a domain you own for better deliverability
- Consider using a subdomain (e.g., noreply@app.yourdomain.com)

### Rate Limiting
- Free tier: 100 emails/day
- Paid plans: Higher limits available
- Consider implementing rate limiting on the endpoint

### Monitoring
- Check SendGrid dashboard for delivery statistics
- Monitor bounce rates and spam reports
- Set up alerts for failed deliveries

## Troubleshooting

### Email not sending

1. Check configuration:
```bash
curl http://localhost:3001/api/reports/email-status
```

2. Verify environment variables are set:
```bash
echo $SENDGRID_API_KEY
echo $DEVELOPER_EMAIL
```

3. Check server logs for errors

### Email going to spam

- Verify your sender email in SendGrid
- Use a custom domain instead of generic email providers
- Check SPF and DKIM records
- Avoid spam trigger words in subject/content

### API Key Invalid

- Verify the API key is correct
- Check if the key has been revoked
- Ensure the key has Mail Send permissions
- Create a new API key if needed

## Alternative Email Services

While this implementation uses SendGrid, you can easily swap to other services:

### AWS SES
- Replace `@sendgrid/mail` with `aws-sdk`
- Update `emailService.ts` to use SES API
- Configure AWS credentials

### Mailgun
- Replace with `mailgun-js`
- Update service implementation
- Configure Mailgun API key

### SMTP
- Use `nodemailer`
- Configure SMTP server details
- Works with any SMTP provider

## Support

For SendGrid-specific issues:
- Documentation: https://docs.sendgrid.com
- Support: https://support.sendgrid.com

For application issues:
- Check backend logs
- Review error reports in database
- Test with `/api/reports/test-email` endpoint
