# Phase 1: Cloud Persistence & Sharing - Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Sign up at https://cloudflare.com
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Cloudflare Access**: Configure email allowlist (Phase 1 auth)

## Step 1: Set Up D1 Database

```bash
# Navigate to worker directory
cd workers/api

# Install dependencies
npm install

# Create D1 database
wrangler d1 create vizail-db

# Note the database_id from output and update wrangler.toml
# Replace "placeholder-id" with the actual database_id
To access your new D1 Database in your Worker, add the following snippet to your configuration file:
[[d1_databases]]
binding = "vizail_db"
database_name = "vizail-db"
database_id = "313e76a2-8864-495d-abe2-5cbc6e419847"

# Run migrations
wrangler d1 execute vizail-db --file=schema.sql
```

## Step 2: Deploy Worker API

```bash
# Still in workers/api directory

# Deploy to staging
npm run deploy:staging

# Test the deployment
curl https://vizail-api.<your-subdomain>.workers.dev/health

# Deploy to production
npm run deploy:production
```

## Step 3: Set Up Cloudflare Access (Phase 1 Authentication)

1. Go to Cloudflare Zero Trust dashboard
2. Navigate to Access > Applications
3. Click "Add an application"
4. Choose "Self-hosted"
5. Configure:
  - **Application name**: Vizail
   - **Session duration**: 24 hours
   - **Application domain**: your-app.pages.dev (or custom domain)
6. Add policy:
   - **Policy name**: Email allowlist
   - **Action**: Allow
   - **Include**: Emails ending in your domain or specific emails
7. Save application

## Step 4: Deploy Cloudflare Pages

```bash
# From root directory
cd ../..

# Build the app
npm run build

# Deploy to Cloudflare Pages (first time setup)
npx wrangler pages deploy dist --project-name=vizail

# For subsequent deploys (automated via GitHub Actions recommended)
git push origin main
```

## Step 5: Configure Environment Variables

In Cloudflare Pages dashboard:

1. Go to Settings > Environment Variables
2. Add for both Production and Preview:
  - `API_BASE_URL`: Your Worker API URL (e.g., `https://vizail-api.<your-subdomain>.workers.dev/api`)

## Step 6: Set Up GitHub Actions (Optional but Recommended)

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: vizail
          directory: dist
```

## Testing the Deployment

1. Visit your Cloudflare Pages URL
2. You should be redirected to Cloudflare Access login
3. Enter an allowed email address
4. After authentication, the app should load
5. Create a canvas - it should save to D1 database
6. Check browser Network tab to verify API calls

## Troubleshooting

### Worker not receiving auth headers

- Verify Cloudflare Access is properly configured
- Check that the application domain matches your Pages deployment
- Inspect `CF-Access-Authenticated-User-Email` header in requests

### CORS errors

- Ensure Worker API returns proper CORS headers
- Check that `API_BASE_URL` environment variable is set correctly

### Database errors

- Verify D1 database is created and schema is applied
- Check `database_id` in `wrangler.toml` matches actual database
- Review Worker logs: `wrangler tail vizail-api`

### Offline mode not working

- Check browser console for errors
- Verify localStorage is enabled in browser
- Test online/offline detection manually

## Next Steps

- Phase 2: Add real-time collaboration with Durable Objects
- Phase 3: Implement in-app authentication (email/OAuth)
- Monitor usage and costs in Cloudflare dashboard
