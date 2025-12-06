# PHASE 3: DEPLOYMENT GUIDE

**Ngày tạo:** 06/12/2025  
**Mục đích:** Hướng dẫn triển khai Phase 3 lên production

---

## 🎯 DEPLOYMENT OVERVIEW

### Components to Deploy

1. **Backend Services**
   - AnalyticsService
   - PdfService
   - SignedUrlService
   - New Controllers

2. **Database Changes**
   - No new migrations (using existing schema)

3. **Environment Variables**
   - SIGNED_URL_SECRET
   - API_URL

4. **File Storage**
   - /uploads/previews/
   - /uploads/thumbnails/

5. **Frontend**
   - Analytics dashboard
   - Preview viewer
   - Updated material cards

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Backend

- [ ] Install dependencies: `npm install pdf-lib pdf-parse sharp`
- [ ] Create all service files
- [ ] Create all controller files
- [ ] Update MarketplaceModule
- [ ] Run unit tests: `npm test`
- [ ] Run integration tests: `npm run test:e2e`
- [ ] Build project: `npm run build`
- [ ] Verify no TypeScript errors

### Frontend

- [ ] Create analytics API client
- [ ] Create analytics dashboard page
- [ ] Create preview viewer page
- [ ] Update material card component
- [ ] Build project: `npm run build`
- [ ] Verify no build errors

### Environment

- [ ] Generate SIGNED_URL_SECRET
- [ ] Set API_URL for production
- [ ] Create upload directories
- [ ] Configure nginx for file serving

---

## 🔧 BACKEND DEPLOYMENT

### Step 1: Install Dependencies

```bash
cd talkplatform-backend
npm install pdf-lib pdf-parse sharp
```

### Step 2: Environment Variables

**File:** `talkplatform-backend/.env.production`

```env
# Existing variables...

# Phase 3: Marketplace Enhancement
SIGNED_URL_SECRET=<generate-with-openssl-rand-hex-32>
API_URL=https://your-domain.com/api/v1

# File upload limits
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,mp4,mp3,pptx,docx,zip
```

Generate secret:
```bash
openssl rand -hex 32
```

### Step 3: Create Upload Directories

```bash
cd talkplatform-backend
mkdir -p uploads/previews
mkdir -p uploads/thumbnails
chmod 755 uploads/previews
chmod 755 uploads/thumbnails
```

### Step 4: Build and Deploy

```bash
# Build
npm run build

# Test build
node dist/main.js

# Deploy with PM2
pm2 start dist/main.js --name "talkplatform-api"
pm2 save
```

### Step 5: Nginx Configuration

**File:** `/etc/nginx/sites-available/talkplatform`

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for large file downloads
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Static file serving
    location /uploads/ {
        alias /path/to/talkplatform-backend/uploads/;
        expires 1h;
        add_header Cache-Control "public, immutable";
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎨 FRONTEND DEPLOYMENT

### Step 1: Environment Variables

**File:** `talkplatform-frontend/.env.production`

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 2: Build

```bash
cd talkplatform-frontend
npm run build
```

### Step 3: Deploy

**Option A: PM2**
```bash
pm2 start npm --name "talkplatform-web" -- start
pm2 save
```

**Option B: Docker**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3001
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t talkplatform-frontend .
docker run -d -p 3001:3001 --name talkplatform-web talkplatform-frontend
```

---

## 🗄️ DATABASE VERIFICATION

### Check Existing Schema

```sql
-- Verify materials table has required columns
DESCRIBE materials;

-- Should have:
-- - preview_url VARCHAR(500)
-- - thumbnail_url VARCHAR(500)
-- - page_count INT

-- Verify material_purchases table
DESCRIBE material_purchases;

-- Should have:
-- - download_count INT
-- - last_downloaded_at TIMESTAMP
```

### Add Missing Columns (if needed)

```sql
-- Add preview_url if missing
ALTER TABLE materials 
ADD COLUMN preview_url VARCHAR(500) AFTER file_url;

-- Add thumbnail_url if missing
ALTER TABLE materials 
ADD COLUMN thumbnail_url VARCHAR(500) AFTER preview_url;

-- Add page_count if missing
ALTER TABLE materials 
ADD COLUMN page_count INT AFTER duration;
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### 1. Health Check

```bash
# Check API health
curl https://your-domain.com/api/v1/health

# Check file serving
curl -I https://your-domain.com/uploads/test.pdf
```

### 2. Test Analytics Endpoint

```bash
curl -X GET "https://your-domain.com/api/v1/marketplace/analytics/revenue" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "total_revenue": 0,
  "platform_fee": 0,
  "teacher_earnings": 0,
  "total_sales": 0,
  "avg_sale_price": 0
}
```

### 3. Test Preview Generation

```bash
# Upload a PDF
curl -X POST "https://your-domain.com/api/v1/marketplace/teacher/materials/upload" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -F "file=@test.pdf"

# Check if preview files were created
ls /path/to/uploads/previews/
ls /path/to/uploads/thumbnails/
```

### 4. Test Signed URL

```bash
# Get download URL
curl -X GET "https://your-domain.com/api/v1/marketplace/student/materials/MATERIAL_ID/download" \
  -H "Authorization: Bearer STUDENT_TOKEN"

# Use the returned URL to download
curl -X GET "SIGNED_URL" --output test_download.pdf
```

### 5. Test Frontend

1. Navigate to `https://your-domain.com/marketplace`
2. Upload material as teacher
3. View material preview
4. Purchase material as student
5. Download material
6. Check analytics dashboard

---

## 📊 MONITORING SETUP

### 1. Application Logs

**PM2 Logs:**
```bash
# View logs
pm2 logs talkplatform-api
pm2 logs talkplatform-web

# Save logs to file
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Error Tracking

**Sentry Integration:**

```typescript
// talkplatform-backend/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 3. Performance Monitoring

**New Relic or DataDog:**

```bash
# Install New Relic
npm install newrelic

# Add to main.ts
require('newrelic');
```

### 4. Database Monitoring

```sql
-- Monitor slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'talkplatform'
ORDER BY size_mb DESC;
```

---

## 🚨 ROLLBACK PLAN

### If Deployment Fails

**Backend Rollback:**
```bash
# Stop new version
pm2 stop talkplatform-api

# Restore previous version
cd talkplatform-backend
git checkout <previous-commit>
npm install
npm run build
pm2 restart talkplatform-api
```

**Frontend Rollback:**
```bash
pm2 stop talkplatform-web
cd talkplatform-frontend
git checkout <previous-commit>
npm install
npm run build
pm2 restart talkplatform-web
```

**Database Rollback:**
```sql
-- If you added new columns, remove them
ALTER TABLE materials DROP COLUMN preview_url;
ALTER TABLE materials DROP COLUMN thumbnail_url;
ALTER TABLE materials DROP COLUMN page_count;
```

---

## 🔐 SECURITY HARDENING

### 1. File Upload Security

```typescript
// Add to upload.service.ts
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'video/mp4',
    'audio/mpeg',
    'application/zip',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('File type not allowed');
}

if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('File too large');
}
```

### 2. Rate Limiting

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10, // 10 requests per minute
    }),
  ],
})
```

### 3. CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
```

---

## 📈 PERFORMANCE OPTIMIZATION

### 1. Database Indexes

```sql
-- Add indexes for analytics queries
CREATE INDEX idx_material_purchases_teacher 
ON material_purchases(material_id, purchased_at);

CREATE INDEX idx_materials_teacher_published 
ON materials(teacher_id, is_published, total_sales);
```

### 2. Caching

```bash
npm install @nestjs/cache-manager cache-manager
```

```typescript
// Cache analytics results
@UseInterceptors(CacheInterceptor)
@CacheTTL(300) // 5 minutes
@Get('revenue')
async getRevenueStats() {
  // ...
}
```

### 3. File Compression

```nginx
# nginx.conf
gzip on;
gzip_types application/pdf video/mp4 audio/mpeg;
gzip_min_length 1000;
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database verified
- [ ] Backup created

### Deployment
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] File directories created

### Post-Deployment
- [ ] Health checks passing
- [ ] Analytics endpoint working
- [ ] Preview generation working
- [ ] Signed URLs working
- [ ] Download tracking working
- [ ] Monitoring configured
- [ ] Logs accessible

### Verification
- [ ] Manual testing completed
- [ ] Performance acceptable
- [ ] Error rates normal
- [ ] User acceptance testing passed

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue 1: Preview generation fails**
```bash
# Check pdf-lib installation
npm list pdf-lib

# Check file permissions
ls -la uploads/previews/

# Check logs
pm2 logs talkplatform-api --lines 100
```

**Issue 2: Signed URLs expire too quickly**
```typescript
// Increase expiration time in signed-url.service.ts
generateSignedUrl(materialId, userId, 'full', 30); // 30 minutes instead of 15
```

**Issue 3: Large file downloads timeout**
```nginx
# Increase nginx timeout
proxy_read_timeout 600s;
proxy_send_timeout 600s;
```

---

## 🎉 SUCCESS CRITERIA

Deployment is successful when:

- ✅ All endpoints return 200 OK
- ✅ Preview generation works for PDFs
- ✅ Signed URLs work and expire correctly
- ✅ Analytics dashboard displays data
- ✅ Revenue calculations are accurate (70/30 split)
- ✅ Download tracking increments correctly
- ✅ No errors in logs
- ✅ Performance meets requirements (<2s response time)

---

**Deployment Complete! 🚀**

**Next Steps:**
1. Monitor error rates for 24 hours
2. Collect user feedback
3. Plan Phase 4 enhancements
