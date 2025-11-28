# CloudFront Quick Reference

## What is CloudFront?

CloudFront is AWS's Content Delivery Network (CDN). It caches your website at edge locations worldwide for faster access.

## Why It's Included

1. **HTTPS/SSL** - Free SSL certificate, secure connections
2. **Speed** - Content served from nearest edge location
3. **Cost** - Often cheaper than S3 direct (caching reduces S3 requests)
4. **Custom Domain** - Easy to add your own domain
5. **Compression** - Automatic gzip/brotli
6. **Security** - DDoS protection included

## How It Works

```
User Request
    ↓
CloudFront Edge Location (nearest to user)
    ↓ (if not cached)
S3 Bucket (origin)
    ↓
CloudFront caches response
    ↓
User receives content (fast!)
```

## Deployment Flow

```bash
# 1. Build frontend
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://your-bucket --delete

# 3. Invalidate CloudFront cache (important!)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

**Why invalidate?** CloudFront caches files. Without invalidation, users see old content for 24 hours.

## Cache Invalidation

**What it does:** Tells CloudFront to fetch fresh content from S3

**When to use:**
- ✅ After deploying new frontend code
- ✅ After updating model files
- ✅ After changing any static assets

**Cost:** First 1,000 invalidations/month free, then $0.005 per path

**Example:**
```bash
# Invalidate everything
aws cloudfront create-invalidation \
  --distribution-id D1234567890ABC \
  --paths "/*"

# Invalidate specific files
aws cloudfront create-invalidation \
  --distribution-id D1234567890ABC \
  --paths "/index.html" "/assets/*"
```

## URLs

After deployment, you get two URLs:

**S3 Direct (HTTP only):**
```
http://domino-app-frontend.s3-website-us-east-1.amazonaws.com
```

**CloudFront (HTTPS):**
```
https://d1234567890abc.cloudfront.net
```

**Use CloudFront URL for:**
- ✅ Production
- ✅ Sharing with users
- ✅ Mobile apps
- ✅ Anywhere you need HTTPS

## Custom Domain Setup

### Quick Steps:

1. **Request SSL certificate** (us-east-1 region):
   ```bash
   aws acm request-certificate \
     --domain-name dominoes.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate certificate** (add DNS record shown in ACM console)

3. **Update CloudFormation** (uncomment Aliases section)

4. **Add DNS CNAME**:
   ```
   dominoes.yourdomain.com → d1234567890abc.cloudfront.net
   ```

5. **Done!** Access at https://dominoes.yourdomain.com

## Monitoring

### Check distribution status:
```bash
aws cloudfront get-distribution \
  --id D1234567890ABC \
  --query 'Distribution.Status'
```

### View cache statistics:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=D1234567890ABC \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Users see old content after deployment
**Solution:** Invalidate cache
```bash
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 403 Forbidden errors
**Solution:** Check S3 bucket policy allows CloudFront access

### Slow first load, fast after
**Normal!** First request fetches from S3, subsequent requests use cache

### Custom domain not working
**Check:**
1. Certificate is in us-east-1 region
2. Certificate is validated (status: Issued)
3. DNS CNAME points to CloudFront domain
4. Aliases configured in CloudFormation

## Cost Optimization

### Free Tier (12 months):
- 1TB data transfer out
- 10M HTTP/HTTPS requests
- 2M CloudFront Function invocations

**Your usage (10 friends, 100 games/month):**
- ~1GB data transfer
- ~10k requests
- **Cost: $0/month** ✅

### After Free Tier:
- Data transfer: $0.085/GB
- Requests: $0.0075 per 10k

**Your usage:** ~$0.10/month

### Tips to reduce costs:
1. ✅ Use CloudFront (caches content, reduces S3 requests)
2. ✅ Enable compression (reduces data transfer)
3. ✅ Set appropriate cache TTLs
4. ✅ Use PriceClass_100 (North America + Europe only)

## Cache Behavior

**Default TTL:** 24 hours

**Files cached:**
- HTML: 5 minutes (short TTL for updates)
- JS/CSS: 1 year (versioned filenames)
- Images: 1 year
- Model files: 1 year

**Cache key:** Full URL path

**Example:**
- `/index.html` - cached separately
- `/assets/index-abc123.js` - cached separately
- `/models/custom-domino/model.json` - cached separately

## Best Practices

1. ✅ **Always invalidate after deployment**
2. ✅ **Use versioned filenames** (Vite does this automatically)
3. ✅ **Enable compression** (already configured)
4. ✅ **Use HTTPS** (redirect-to-https enabled)
5. ✅ **Monitor cache hit ratio** (aim for >80%)

## Quick Commands

```bash
# Get CloudFront URL
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text

# Get Distribution ID
aws cloudformation describe-stacks \
  --stack-name domino-app-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudformation describe-stacks \
    --stack-name domino-app-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text) \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id YOUR_DIST_ID
```
