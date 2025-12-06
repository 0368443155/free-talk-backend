# PHASE 3: MARKETPLACE ENHANCEMENT - HƯỚNG DẪN TEST CHI TIẾT

**Ngày tạo:** 06/12/2025  
**Phiên bản:** 1.0  
**Trạng thái:** ✅ Sẵn sàng test

---

## 📋 MỤC LỤC

1. [Chuẩn Bị Test](#chuẩn-bị-test)
2. [Test Revenue Dashboard](#test-revenue-dashboard)
3. [Test Signed URL](#test-signed-url)
4. [Test PDF Preview Generator](#test-pdf-preview-generator)
5. [Test Performance Optimization](#test-performance-optimization)
6. [Test Integration](#test-integration)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 CHUẨN BỊ TEST

### 1. Prerequisites

- ✅ Backend server đang chạy (`http://localhost:3000`)
- ✅ Frontend server đang chạy (`http://localhost:3001`)
- ✅ Database đã chạy migration: `npm run migration:run`
- ✅ Redis server đang chạy (cho caching)
- ✅ Có ít nhất 2 user accounts:
  - **Teacher Account** (role: `teacher`, đã verified)
  - **Student Account** (role: `student`, có credits)

### 2. Test Data Setup

```bash
# 1. Login as Teacher
# 2. Upload ít nhất 3-5 PDF materials với giá khác nhau
# 3. Publish materials
# 4. Login as Student
# 5. Purchase ít nhất 2-3 materials
# 6. Tạo thêm vài purchases với dates khác nhau (để test time series)
```

### 3. Environment Variables Check

**Backend (.env):**
```env
SIGNED_URL_SECRET=your-secret-key-here
API_URL=http://localhost:3000/api/v1
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## 📊 TEST REVENUE DASHBOARD

### Test Case 1: Access Analytics Dashboard

**Steps:**
1. Login as **Teacher** account
2. Navigate to `/teacher/materials/analytics`
3. Verify page loads without errors

**Expected Results:**
- ✅ Page loads successfully
- ✅ Shows 4 stats cards:
  - Total Revenue
  - Your Earnings (70%)
  - Platform Fee (30%)
  - Avg Sale Price
- ✅ Shows "Revenue Over Time" chart
- ✅ Shows "Top Selling Materials" list

**Screenshot Locations:**
- Stats cards should display numbers (not "Loading...")
- Chart should render (even if empty)

---

### Test Case 2: Revenue Stats Calculation

**Prerequisites:**
- Teacher đã có ít nhất 1 material được purchase

**Steps:**
1. Navigate to `/teacher/materials/analytics`
2. Check "Total Revenue" card
3. Check "Your Earnings" card
4. Check "Platform Fee" card
5. Verify calculation: `Your Earnings = Total Revenue * 0.7`
6. Verify calculation: `Platform Fee = Total Revenue * 0.3`

**Expected Results:**
- ✅ Total Revenue = sum of all `price_paid` from purchases
- ✅ Your Earnings = Total Revenue * 0.7 (70%)
- ✅ Platform Fee = Total Revenue * 0.3 (30%)
- ✅ Avg Sale Price = Total Revenue / Total Sales

**Manual Verification:**
```sql
-- Check in database
SELECT 
    SUM(price_paid) as total_revenue,
    COUNT(*) as total_sales,
    SUM(price_paid) * 0.7 as teacher_earnings,
    SUM(price_paid) * 0.3 as platform_fee
FROM material_purchases mp
JOIN materials m ON mp.material_id = m.id
WHERE m.teacher_id = 'YOUR_TEACHER_ID';
```

---

### Test Case 3: Date Range Filter

**Steps:**
1. Navigate to `/teacher/materials/analytics`
2. Set start date to 30 days ago
3. Set end date to today
4. Verify stats update
5. Change to different date range (e.g., last 7 days)
6. Verify stats recalculate

**Expected Results:**
- ✅ Stats cards update when date range changes
- ✅ Chart data updates accordingly
- ✅ Only purchases within date range are counted

**Test Scenarios:**
- **Scenario A:** Date range with no purchases → Should show 0
- **Scenario B:** Date range with purchases → Should show correct totals
- **Scenario C:** Future date range → Should show 0

---

### Test Case 4: Period Selector (Day/Week/Month)

**Steps:**
1. Navigate to `/teacher/materials/analytics`
2. Select "Daily" period
3. Verify chart shows daily data points
4. Select "Weekly" period
5. Verify chart shows weekly data points
6. Select "Monthly" period
7. Verify chart shows monthly data points

**Expected Results:**
- ✅ Chart X-axis labels change based on period
- ✅ Data points grouped correctly:
  - **Daily:** One point per day
  - **Weekly:** One point per week
  - **Monthly:** One point per month
- ✅ Revenue values aggregated correctly per period

**Visual Check:**
- Daily: More data points, closer together
- Weekly: Fewer data points, grouped by week
- Monthly: Even fewer points, grouped by month

---

### Test Case 5: Top Materials List

**Steps:**
1. Navigate to `/teacher/materials/analytics`
2. Scroll to "Top Selling Materials" section
3. Verify materials are sorted by `total_sales` (descending)
4. Check each material shows:
   - Rank number (#1, #2, #3...)
   - Thumbnail (if available)
   - Title
   - Total sales count
   - Teacher earnings
   - Total revenue

**Expected Results:**
- ✅ Materials sorted by sales (highest first)
- ✅ All required fields displayed
- ✅ Earnings = Total Revenue * 0.7
- ✅ Thumbnail displays or shows placeholder

**Edge Cases:**
- **No materials:** Should show "No materials sold yet"
- **No thumbnail:** Should show placeholder or "No Image"

---

### Test Case 6: API Endpoints Test

**Test với cURL hoặc Postman:**

#### 6.1. Get Revenue Stats
```bash
curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/revenue" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "total_revenue": 1000,
  "platform_fee": 300,
  "teacher_earnings": 700,
  "total_sales": 5,
  "avg_sale_price": 200
}
```

#### 6.2. Get Revenue Stats with Date Range
```bash
curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/revenue?start_date=2025-11-01&end_date=2025-12-01" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

#### 6.3. Get Top Materials
```bash
curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/top-materials?limit=5" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

**Expected Response:**
```json
[
  {
    "material_id": "uuid",
    "title": "Material Title",
    "thumbnail_url": "/uploads/thumbnails/...",
    "total_sales": 10,
    "total_revenue": 2000,
    "teacher_earnings": 1400
  }
]
```

#### 6.4. Get Revenue Chart Data
```bash
curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/revenue-chart?period=day&start_date=2025-11-01&end_date=2025-12-01" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

**Expected Response:**
```json
[
  {
    "date": "2025-11-01",
    "revenue": 200,
    "sales_count": 2
  },
  {
    "date": "2025-11-02",
    "revenue": 300,
    "sales_count": 3
  }
]
```

#### 6.5. Get Material Revenue Breakdown
```bash
curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/material/MATERIAL_ID" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

**Expected Response:**
```json
{
  "material": { ... },
  "total_revenue": 1000,
  "platform_fee": 300,
  "teacher_earnings": 700,
  "total_sales": 5,
  "recent_purchases": [ ... ]
}
```

---

## 🔐 TEST SIGNED URL

### Test Case 7: Generate Signed Download URL

**Prerequisites:**
- Student đã purchase ít nhất 1 material

**Steps:**
1. Login as **Student**
2. Navigate to `/marketplace/my-purchases`
3. Click "Download" button on a purchased material
4. Verify download starts

**Expected Results:**
- ✅ Download button triggers API call to `/marketplace/materials/{id}/download`
- ✅ API returns signed URL with expiration
- ✅ Browser navigates to signed URL
- ✅ File downloads successfully

**API Response Check:**
```json
{
  "download_url": "http://localhost:3000/api/v1/marketplace/download/ENCODED_PAYLOAD/SIGNATURE",
  "expires_at": "2025-12-06T09:15:00.000Z"
}
```

---

### Test Case 8: Signed URL Expiration

**Steps:**
1. Get signed download URL (from Test Case 7)
2. Wait 16+ minutes (expiration is 15 minutes)
3. Try to access the signed URL directly
4. Verify access is denied

**Expected Results:**
- ✅ Before expiration: File downloads successfully
- ✅ After expiration: Returns `401 Unauthorized` with message "Download link has expired"

**Error Response:**
```json
{
  "statusCode": 401,
  "message": "Download link has expired"
}
```

---

### Test Case 9: Signed URL Security - User Verification

**Steps:**
1. Login as **Student A**
2. Get signed download URL for a material purchased by Student A
3. Copy the signed URL
4. Login as **Student B** (different account)
5. Try to access the signed URL from Student A
6. Verify access is denied

**Expected Results:**
- ✅ Returns `401 Unauthorized`
- ✅ Message: "This download link belongs to another user"

**Security Check:**
- ✅ Signed URL contains `user_id` in payload
- ✅ Backend verifies `user_id` matches current user
- ✅ Cannot access other users' download links

---

### Test Case 10: Signed URL Security - Signature Verification

**Steps:**
1. Get a valid signed download URL
2. Modify the signature (change last character)
3. Try to access the modified URL
4. Verify access is denied

**Expected Results:**
- ✅ Returns `401 Unauthorized`
- ✅ Message: "Invalid download link"

**Security Check:**
- ✅ HMAC signature prevents tampering
- ✅ Any modification to payload or signature invalidates URL

---

### Test Case 11: Download Controller - Full Material Download

**Prerequisites:**
- Student đã purchase material

**Steps:**
1. Access signed download URL
2. Verify file streams correctly
3. Check response headers:
   - `Content-Type`: Should match file type (e.g., `application/pdf`)
   - `Content-Disposition`: Should include filename
   - `Cache-Control`: Should be `no-cache, no-store, must-revalidate`

**Expected Results:**
- ✅ File downloads with correct filename
- ✅ File content is correct (not corrupted)
- ✅ Headers prevent caching
- ✅ Download count incremented in database

**Database Check:**
```sql
-- Verify download_count incremented
SELECT download_count, last_downloaded_at 
FROM material_purchases 
WHERE material_id = 'MATERIAL_ID' AND user_id = 'USER_ID';
```

---

### Test Case 12: Download Controller - Preview Download

**Steps:**
1. Get preview signed URL (public, no purchase required)
2. Access the preview URL
3. Verify preview PDF downloads (first 3 pages only)
4. Check watermark "PREVIEW" appears

**Expected Results:**
- ✅ Preview downloads successfully
- ✅ Only first 3 pages included
- ✅ Watermark visible on each page
- ✅ No purchase required

---

## 📄 TEST PDF PREVIEW GENERATOR

### Test Case 13: Auto-Generate Preview on Upload

**Steps:**
1. Login as **Teacher**
2. Navigate to `/teacher/materials/upload`
3. Upload a PDF file (at least 5+ pages)
4. Fill in material details
5. Submit form
6. Check response for `preview_url` and `thumbnail_url`

**Expected Results:**
- ✅ Upload succeeds
- ✅ Response includes:
  - `previewUrl`: `/uploads/previews/preview_{materialId}.pdf`
  - `thumbnailUrl`: `/uploads/previews/preview_{materialId}.pdf` (placeholder)
  - `pageCount`: Actual page count of PDF
- ✅ Preview file created in `uploads/previews/` directory
- ✅ Preview contains only first 3 pages
- ✅ Watermark "PREVIEW" appears on each page

**File System Check:**
```bash
# Check preview file exists
ls uploads/previews/preview_*.pdf

# Verify file size (should be smaller than original)
# Verify page count (should be 3 or less)
```

---

### Test Case 14: Preview Watermark Verification

**Steps:**
1. Download preview PDF (from Test Case 13)
2. Open PDF in PDF viewer
3. Check each page for watermark
4. Verify watermark properties:
   - Text: "PREVIEW"
   - Position: Center, diagonal (-45 degrees)
   - Opacity: 30%
   - Color: Light gray

**Expected Results:**
- ✅ Watermark visible on all pages
- ✅ Watermark doesn't obscure content too much
- ✅ Watermark is clearly visible

**Visual Check:**
- Open preview in browser: `/uploads/previews/preview_{id}.pdf`
- Or download and open in PDF reader

---

### Test Case 15: Preview Page Count Validation

**Test Scenarios:**

#### Scenario A: PDF with 1-3 pages
1. Upload PDF with 2 pages
2. Verify preview contains all 2 pages

#### Scenario B: PDF with 4+ pages
1. Upload PDF with 10 pages
2. Verify preview contains only first 3 pages

**Expected Results:**
- ✅ Preview never exceeds 3 pages
- ✅ If PDF has ≤3 pages, all pages included
- ✅ If PDF has >3 pages, only first 3 included

---

### Test Case 16: Preview Viewer Page

**Steps:**
1. Navigate to `/marketplace` (as any user, no login required)
2. Find a material with `preview_url`
3. Click "Preview" button on material card
4. Or navigate to `/marketplace/{id}/preview`
5. Verify preview page loads

**Expected Results:**
- ✅ Preview page loads successfully
- ✅ Shows material info (title, description, teacher)
- ✅ Shows warning: "This is a preview. Purchase to access the full material."
- ✅ PDF viewer (iframe) displays preview
- ✅ Preview is scrollable
- ✅ Watermark visible in preview

**UI Check:**
- ✅ "Back" button works
- ✅ "View Details" button links to material detail page
- ✅ Alert banner displays correctly

---

### Test Case 17: Preview for Non-PDF Materials

**Steps:**
1. Upload a non-PDF material (e.g., video, audio)
2. Verify no preview is generated
3. Check material detail page
4. Verify preview tab shows "Preview not available"

**Expected Results:**
- ✅ Non-PDF materials don't generate preview
- ✅ `preview_url` is `null` in database
- ✅ Frontend handles missing preview gracefully

---

### Test Case 18: Corrupt PDF Handling

**Steps:**
1. Create a corrupt/invalid PDF file
2. Try to upload as material
3. Verify error handling

**Expected Results:**
- ✅ Upload fails with error
- ✅ Error message: "Invalid or corrupt PDF file"
- ✅ File is deleted from server
- ✅ No preview generated

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid or corrupt PDF file"
}
```

---

### Test Case 19: PDF Metadata Extraction

**Steps:**
1. Upload a PDF with metadata (title, author)
2. Check if metadata is extracted
3. Verify `page_count` is correct

**Expected Results:**
- ✅ `page_count` extracted correctly
- ✅ Metadata can be used for material info (optional)

**Database Check:**
```sql
SELECT page_count, title 
FROM materials 
WHERE id = 'MATERIAL_ID';
```

---

## ⚡ TEST PERFORMANCE OPTIMIZATION

### Test Case 20: Caching - First Request vs Cached Request

**Steps:**
1. Clear Redis cache (optional)
2. Make API call to `/marketplace/analytics/revenue` (first time)
3. Note response time
4. Make same API call immediately (second time)
5. Note response time
6. Compare times

**Expected Results:**
- ✅ First request: Slower (hits database)
- ✅ Second request: Faster (hits cache)
- ✅ Response data is identical

**Performance Check:**
```bash
# First request (no cache)
time curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/revenue" \
  -H "Authorization: Bearer TOKEN"

# Second request (cached)
time curl -X GET "http://localhost:3000/api/v1/marketplace/analytics/revenue" \
  -H "Authorization: Bearer TOKEN"
```

**Expected Improvement:**
- First: ~200-500ms
- Cached: ~10-50ms (80-90% faster)

---

### Test Case 21: Cache Expiration

**Steps:**
1. Make API call to get revenue stats
2. Wait 6 minutes (cache TTL is 5 minutes)
3. Make same API call
4. Verify cache expired and data refreshed

**Expected Results:**
- ✅ Within 5 minutes: Returns cached data
- ✅ After 5 minutes: Returns fresh data from database

**Redis Check:**
```bash
# Check cache key exists
redis-cli GET "analytics:revenue:TEACHER_ID:all"

# Check TTL
redis-cli TTL "analytics:revenue:TEACHER_ID:all"
```

---

### Test Case 22: Cache Invalidation on Purchase

**Steps:**
1. Get revenue stats (cache it)
2. Verify cache exists in Redis
3. As student, purchase a material from that teacher
4. Get revenue stats again
5. Verify stats updated (cache cleared)

**Expected Results:**
- ✅ After purchase, cache is cleared
- ✅ Next request fetches fresh data
- ✅ New purchase included in stats

**Redis Check:**
```bash
# Before purchase
redis-cli GET "analytics:revenue:TEACHER_ID:all"
# Should return cached data

# After purchase
redis-cli GET "analytics:revenue:TEACHER_ID:all"
# Should return null (cache cleared)
```

---

### Test Case 23: Database Indexes Performance

**Prerequisites:**
- Run migration: `npm run migration:run`

**Steps:**
1. Verify indexes created:
```sql
SHOW INDEXES FROM material_purchases;
SHOW INDEXES FROM materials;
```

2. Test query performance:
```sql
-- This query should use index
EXPLAIN SELECT * FROM material_purchases 
WHERE material_id = 'ID' AND purchased_at BETWEEN '2025-11-01' AND '2025-12-01';
```

**Expected Results:**
- ✅ Indexes exist:
  - `idx_material_purchases_teacher_date`
  - `idx_purchases_date`
  - `idx_materials_teacher_sales`
- ✅ EXPLAIN shows index usage
- ✅ Query performance improved

**Performance Check:**
```sql
-- Before index: Full table scan
-- After index: Index scan (much faster)
```

---

## 🔗 TEST INTEGRATION

### Test Case 24: Complete Material Purchase Flow

**End-to-End Test:**

1. **Teacher uploads PDF:**
   - Login as Teacher
   - Upload PDF material
   - Verify preview generated
   - Publish material

2. **Student views preview:**
   - Login as Student
   - Browse marketplace
   - Click "Preview" on material
   - Verify preview displays

3. **Student purchases:**
   - Go to material detail page
   - Click "Buy Now"
   - Verify purchase succeeds
   - Verify credits deducted

4. **Student downloads:**
   - Go to "My Purchases"
   - Click "Download"
   - Verify signed URL generated
   - Verify file downloads

5. **Teacher checks analytics:**
   - Login as Teacher
   - Go to Analytics dashboard
   - Verify new purchase appears in stats
   - Verify revenue updated

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Data flows correctly between components
- ✅ Cache invalidation works
- ✅ Revenue calculations correct

---

### Test Case 25: Multiple Teachers Analytics

**Steps:**
1. Create 2 teacher accounts
2. Each teacher uploads materials
3. Students purchase from both teachers
4. Each teacher checks their analytics
5. Verify data isolation

**Expected Results:**
- ✅ Teacher A only sees their own revenue
- ✅ Teacher B only sees their own revenue
- ✅ No data leakage between teachers

---

### Test Case 26: Material Card Preview Button

**Steps:**
1. Browse marketplace
2. Find material with `preview_url`
3. Verify "Preview" button appears
4. Click "Preview" button
5. Verify navigates to preview page

**Expected Results:**
- ✅ Preview button only shows if `preview_url` exists
- ✅ Button links to `/marketplace/{id}/preview`
- ✅ Preview page loads correctly

---

## 🐛 TROUBLESHOOTING

### Issue 1: Analytics Dashboard Shows 0 Revenue

**Possible Causes:**
- No purchases yet
- Date range filter excludes purchases
- Cache showing stale data

**Solutions:**
1. Check if purchases exist:
```sql
SELECT * FROM material_purchases mp
JOIN materials m ON mp.material_id = m.id
WHERE m.teacher_id = 'TEACHER_ID';
```

2. Clear cache:
```bash
redis-cli FLUSHDB
```

3. Check date range filter

---

### Issue 2: Preview Not Generated

**Possible Causes:**
- PDF file is corrupt
- Upload failed
- PdfService error

**Solutions:**
1. Check backend logs:
```bash
# Look for PdfService errors
grep "PdfService" logs/error.log
```

2. Verify PDF file is valid:
```bash
# Try opening PDF manually
```

3. Check file permissions:
```bash
ls -la uploads/previews/
```

---

### Issue 3: Signed URL Returns 401

**Possible Causes:**
- URL expired
- Signature invalid
- User mismatch

**Solutions:**
1. Check expiration time:
```javascript
// Decode payload
const payload = JSON.parse(atob(encodedPayload));
console.log('Expires at:', new Date(payload.expires_at));
```

2. Verify user_id matches:
```javascript
console.log('User ID in URL:', payload.user_id);
console.log('Current user ID:', currentUser.id);
```

3. Regenerate URL (don't reuse old URLs)

---

### Issue 4: Cache Not Working

**Possible Causes:**
- Redis not running
- Cache service not injected
- TTL too short

**Solutions:**
1. Check Redis connection:
```bash
redis-cli PING
# Should return PONG
```

2. Check cache service in module:
```typescript
// Verify InfrastructureCacheModule imported
```

3. Check Redis logs:
```bash
redis-cli MONITOR
```

---

### Issue 5: Database Indexes Not Created

**Possible Causes:**
- Migration not run
- Index already exists
- Migration error

**Solutions:**
1. Check migration status:
```bash
npm run migration:show
```

2. Run migration manually:
```bash
npm run migration:run
```

3. Check indexes:
```sql
SHOW INDEXES FROM material_purchases;
```

---

## ✅ TEST COMPLETION CHECKLIST

### Revenue Dashboard
- [ ] Analytics page loads
- [ ] Stats cards display correctly
- [ ] Revenue calculations correct (70/30 split)
- [ ] Date range filter works
- [ ] Period selector works (day/week/month)
- [ ] Chart renders correctly
- [ ] Top materials list displays
- [ ] API endpoints return correct data

### Signed URL
- [ ] Download URL generated
- [ ] Signed URL works before expiration
- [ ] Signed URL expires after 15 minutes
- [ ] User verification works
- [ ] Signature verification works
- [ ] Download increments count
- [ ] Preview URL works (public)

### PDF Preview
- [ ] Preview generated on upload
- [ ] Preview contains max 3 pages
- [ ] Watermark appears
- [ ] Preview viewer page works
- [ ] Preview button shows on cards
- [ ] Corrupt PDF handled gracefully
- [ ] Non-PDF materials handled

### Performance
- [ ] Caching works (faster on second request)
- [ ] Cache expires correctly
- [ ] Cache invalidated on purchase
- [ ] Database indexes created
- [ ] Query performance improved

### Integration
- [ ] Complete purchase flow works
- [ ] Data isolation between teachers
- [ ] All components work together

---

## 📝 TEST RESULTS TEMPLATE

```
Date: ___________
Tester: ___________
Environment: Development / Production

### Revenue Dashboard
- [ ] Test Case 1: Pass / Fail
- [ ] Test Case 2: Pass / Fail
- [ ] Test Case 3: Pass / Fail
...

### Signed URL
- [ ] Test Case 7: Pass / Fail
...

### PDF Preview
- [ ] Test Case 13: Pass / Fail
...

### Performance
- [ ] Test Case 20: Pass / Fail
...

### Issues Found:
1. [Issue description]
   - Severity: High / Medium / Low
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

### Notes:
[Any additional observations]
```

---

**Next Steps:**
- Run all test cases
- Document any issues found
- Fix issues and retest
- Deploy to production after all tests pass

---

**Last Updated:** 06/12/2025

