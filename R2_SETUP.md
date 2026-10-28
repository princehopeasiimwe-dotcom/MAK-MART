# MAK MART - Supabase + Cloudflare R2 Setup Guide

## Overview
This setup uses **Supabase** for database/auth/realtime (500MB free) + **Cloudflare R2** for file storage (10GB free, no egress fees).

## Quick Start

### 1. Set up Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > R2
2. Create a bucket named `mak-mart`
3. Go to **Manage R2 API Tokens** > Create API Token
   - Permissions: **Object Read & Write**
   - Copy: Account ID, Access Key ID, Secret Access Key
4. (Optional) Set up a custom domain for public URLs:
   - Bucket > Settings > Custom Domain > Connect Domain

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your values:
```env
# Supabase (keep existing)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Cloudflare R2 (NEW)
VITE_R2_ACCOUNT_ID=your-account-id
VITE_R2_ACCESS_KEY_ID=your-access-key-id
VITE_R2_SECRET_ACCESS_KEY=your-secret-access-key
VITE_R2_BUCKET_NAME=mak-mart
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # Optional: custom domain

# Use R2 for uploads
VITE_STORAGE_PROVIDER=r2
```

### 3. Deploy the Upload API (Presigned URLs)

**Option A: Cloudflare Workers (Recommended - Free, Edge)**

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Set secrets
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put ALLOWED_ORIGIN  # Your frontend URL

# Deploy
wrangler deploy
```

**Option B: Vercel/Netlify Functions**

Deploy the files in `api/upload/` as serverless functions.

**Option C: Your own Node.js backend**

Copy the logic from `src/workers/r2-upload.js` to your backend.

### 4. Update Frontend API URL (if needed)

If your API is at a different domain, add to `.env.local`:
```env
VITE_API_URL=https://your-api-domain.com
```

Then update `src/lib/r2.js` to use this URL for presign requests.

### 5. Install Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 6. Test

1. Start dev server: `npm run dev`
2. Go to any page with image upload (vendor dashboard, create product, etc.)
3. Upload an image - it should now go to R2!

## File Structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client (database, auth)
│   ├── r2.js                # R2 client & helpers
│   └── imageUpload.js       # Image compression + upload (uses uploadService)
├── services/
│   └── uploadService.js     # Unified upload service (R2 + Supabase)
├── workers/
│   └── r2-upload.js         # Cloudflare Worker for presigned URLs
└── components/common/
    └── ImageUploadField.jsx # Upload UI component (unchanged)

api/upload/
├── presign.js               # Vercel/Netlify function for presigned URLs
└── delete.js                # Vercel/Netlify function for deletion

wrangler.toml                # Cloudflare Worker config
.env.example                 # Environment template
```

## How It Works

1. **User selects image** → `ImageUploadField` calls `uploadImage()`
2. **Image compressed** client-side (max 1600px, JPEG, 85% quality)
3. **Frontend requests presigned URL** from `/api/upload/presign`
4. **Backend generates presigned URL** for R2 PUT operation
5. **Frontend uploads directly to R2** (browser → R2, no server bandwidth)
6. **R2 returns success** → Frontend gets public URL
7. **Public URL saved to Supabase** database

## Benefits

| Feature | Supabase Storage | Cloudflare R2 |
|---------|------------------|---------------|
| Free Storage | 1 GB | **10 GB** |
| Egress Fees | Yes (after 1 GB) | **Zero** |
| Global CDN | Yes | **Yes (Cloudflare)** |
| Custom Domain | Yes | **Yes** |
| S3 Compatible | No | **Yes** |
| Presigned URLs | Yes | **Yes** |

## Migration from Supabase Storage

Existing images in Supabase Storage will still work (public URLs unchanged). New uploads go to R2.

To migrate existing files:
1. Download from Supabase
2. Upload to R2 (use a script)
3. Update database URLs

## Troubleshooting

**Upload fails with CORS error:**
- Ensure `ALLOWED_ORIGIN` in Worker matches your frontend URL exactly
- Check bucket CORS settings in R2 dashboard

**Presigned URL returns 403:**
- Verify API token has "Object Read & Write" permissions
- Check Account ID, Access Key, Secret Key are correct

**File not accessible publicly:**
- Ensure bucket is public or use presigned download URLs
- For public buckets: R2 > Bucket > Settings > Allow public access

**Large files fail:**
- Check `UPLOAD_CONFIG` in `src/services/uploadService.js`
- Default: 5MB for images, 10MB for documents

## Costs at Scale

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Supabase | 500MB DB, 1GB files, 2GB bandwidth | $25/mo Pro |
| Cloudflare R2 | **10GB storage, unlimited bandwidth** | $0.015/GB/mo |

**Total free: ~500MB DB + 10GB files + unlimited bandwidth**

## Security Notes

- Presigned URLs expire in 1 hour (configurable)
- Folder-based access control in Worker
- Add authentication to `/api/upload/delete` endpoint
- Consider signed URLs for private files

## Next Steps

1. **Add authentication** to delete endpoint
2. **Set up custom domain** for R2 (cdn.yourdomain.com)
3. **Configure cache rules** in Cloudflare for optimal performance
4. **Add image transformations** via Cloudflare Images (optional)
5. **Monitor usage** in Cloudflare Dashboard > R2 > Metrics