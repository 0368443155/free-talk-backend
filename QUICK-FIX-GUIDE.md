# 🔧 Quick Fix Guide - API Issues

## 🚨 Current Issues Fixed
- ✅ Backend API routes corrected
- ✅ Frontend API calls updated 
- ✅ Public endpoints added for SSR
- ✅ Authentication properly configured

## 🎯 Manual Test Steps

### 1. Start Backend
```bash
cd talkplatform-backend
npm run start:dev
# Wait for "Application is running on: http://localhost:3000"
```

### 2. Start Frontend
```bash
cd talkplatform-frontend  
npm run dev
# Wait for "Local: http://localhost:3001"
```

### 3. Test Admin Dashboard
1. Open http://localhost:3001/admin
2. Login if required
3. Check if both sections load:
   - ✅ Traditional Dashboard (should work now)
   - ✅ LiveKit Dashboard (new section)

### 4. Test LiveKit Integration
1. Go to http://localhost:3001/meetings/[any-id]
2. Click **"Join with LiveKit (Enhanced Video)"**
3. Complete Green Room setup
4. Join meeting and verify:
   - ✅ Video grid displays
   - ✅ Bandwidth monitor in header
   - ✅ Metrics sent to backend

## 🔍 Verify Backend APIs

### Check Backend Health
```bash
# Open browser or use curl:
http://localhost:3000/api/metrics/public/hourly
# Should return JSON data or empty array
```

### Check LiveKit Metrics
```bash
# POST test metric:
curl -X POST http://localhost:3000/api/metrics/livekit \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "test-123",
    "userId": "user-456", 
    "platform": "livekit",
    "timestamp": 1642000000000,
    "bitrate": 1000000,
    "packetLoss": 0.5,
    "jitter": 10,
    "rtt": 25,
    "quality": "good"
  }'
# Should return {"success": true, "id": "..."}
```

## 📊 Expected Results

### ✅ Admin Dashboard Working
- Traditional metrics section loads
- LiveKit metrics section shows (may be empty initially)
- No 404 errors in browser console

### ✅ LiveKit Meeting Flow
- Meeting page shows two join options
- LiveKit option leads to Green Room
- Bandwidth monitor shows in meeting header
- Admin dashboard receives metrics

### ✅ Database Populated
```sql
-- Check metrics table:
SELECT * FROM livekit_metrics ORDER BY createdAt DESC LIMIT 5;
-- Should show recent metrics from meetings
```

## 🛠️ Troubleshooting

### Backend Won't Start
```bash
cd talkplatform-backend
rm -rf node_modules package-lock.json
npm install
npm run start:dev
```

### Frontend 404 Errors
- Check browser console for exact URLs
- Verify backend is running on port 3000
- Check authentication token in localStorage

### Database Issues
```bash
cd talkplatform-backend
mysql -u root -p123456 talkplatform
SHOW TABLES LIKE 'livekit_metrics';
```

## 🚀 Success Indicators

When everything works correctly:

1. **Admin Page**: http://localhost:3001/admin
   - No console errors
   - Both dashboard sections visible
   - Data loading indicators work

2. **Meeting Page**: http://localhost:3001/meetings/any-id
   - Join options appear
   - LiveKit flow works end-to-end
   - Metrics appear in admin dashboard after joining

3. **API Health**: 
   - http://localhost:3000/api/metrics/public/hourly returns data
   - Backend logs show successful requests
   - Database has new metric records

## 🎉 Final Verification

1. Complete a LiveKit meeting session
2. Check admin dashboard for new metrics
3. Verify database has records
4. Confirm no errors in browser/server logs

If all steps pass, the system is fully operational! 🚀