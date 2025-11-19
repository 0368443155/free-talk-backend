# 🔧 Environment Setup Checklist & Startup Guide

## ✅ Kiểm tra biến môi trường của bạn

### Backend (.env) - Status: 🟡 Cần cập nhật một vài biến

```bash
# ✅ Database - CONFIGURED
DB_HOST=localhost
DB_PORT=3306  
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=talkplatform

# ✅ Redis - CONFIGURED
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 🟡 JWT - ĐÃ CẬP NHẬT (stronger secret)
JWT_SECRET=talkplatform-super-secret-key-256-bit-minimum-for-production-security
JWT_EXPIRES_IN=7d
JWT_EXPIRATION_TIME=7d

# ✅ LiveKit Cloud - CONFIGURED (tuyệt vời!)
LIVEKIT_API_KEY=APIG5ZQdmpjmTrj
LIVEKIT_API_SECRET=50f6haa2z9sq1GJBj0UqKOe37Yz79OMSqBeACmSCyJJB
LIVEKIT_WS_URL=wss://talkplatform-mqjtdg31.livekit.cloud

# ✅ Additional configs - ĐÃ THÊM
FRONTEND_URLS=http://localhost:3001,http://localhost:3051
ENABLE_WAITING_ROOM=true
ENABLE_VIRTUAL_BACKGROUNDS=true
```

### Frontend (.env.local) - Status: ✅ CONFIGURED

```bash
# ✅ Google OAuth - CONFIGURED
NEXT_PUBLIC_GOOGLE_CLIENT_ID=736439178715-...
GOOGLE_CLIENT_SECRET=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

# ✅ Backend URLs - CONFIGURED
NEXT_PUBLIC_SERVER=http://localhost:3000/api/v1
NEXT_PUBLIC_NESTJS_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# ✅ LiveKit - ĐÃ THÊM
NEXT_PUBLIC_LIVEKIT_WS_URL=wss://talkplatform-mqjtdg31.livekit.cloud

# ✅ YouTube API - CONFIGURED
NEXT_PUBLIC_YOUTUBE_API_KEY=AIzaSyCeToRocXgGeTe-DGDH1QNX-onlC5A-pEM
```

## 🚀 Hướng dẫn khởi động hệ thống

### Bước 1: Khởi động cơ sở dữ liệu (MySQL + Redis)

**Option A: Nếu bạn có MySQL & Redis cài sẵn**
```bash
# Khởi động MySQL (nếu chưa chạy)
# Windows: services.msc -> MySQL80
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql

# Khởi động Redis (nếu chưa chạy)  
# Windows: Tìm Redis service trong services.msc
# macOS: brew services start redis
# Linux: sudo systemctl start redis-server

# Test kết nối
mysql -u root -p123456 -e "SELECT 1;"
redis-cli ping
```

**Option B: Dùng Docker cho MySQL + Redis**
```bash
# Tạo docker-compose.local.yml
cat > docker-compose.local.yml << 'EOF'
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: 123456
      MYSQL_DATABASE: talkplatform
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
EOF

# Khởi động
docker-compose -f docker-compose.local.yml up -d

# Kiểm tra
docker ps
```

### Bước 2: Setup Database Schema

```bash
cd talkplatform-backend

# Cài đặt dependencies (nếu chưa)
npm install --legacy-peer-deps

# Chạy migrations (tạo bảng trong database)
npm run migration:run

# Kiểm tra database đã có bảng chưa
mysql -u root -p123456 talkplatform -e "SHOW TABLES;"
```

**Expected output:**
```
+---------------------------+
| Tables_in_talkplatform    |
+---------------------------+
| blocked_participants      |
| classroom_members         |
| classrooms               |
| meeting_chat_messages    |
| meeting_participants     |
| meetings                 |
| teacher_profiles         |
| users                    |
| migrations               |
+---------------------------+
```

### Bước 3: Khởi động Backend

```bash
cd talkplatform-backend

# Development mode với auto-reload
npm run start:dev

# Hoặc production mode
# npm run build && npm run start:prod
```

**Kiểm tra backend hoạt động:**
```bash
# Health check
curl http://localhost:3000/api/v1/

# LiveKit connection test  
curl http://localhost:3000/api/v1/livekit/connection-info
```

**Expected response:**
```json
{
  "wsUrl": "wss://talkplatform-mqjtdg31.livekit.cloud",
  "available": true,
  "version": "1.0.0"
}
```

### Bước 4: Khởi động Frontend

```bash
cd talkplatform-frontend

# Cài đặt dependencies (nếu chưa)
npm install

# Development mode
npm run dev

# Hoặc production mode
# npm run build && npm start
```

**Access URLs:**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api/v1
- **Backend Health**: http://localhost:3000

### Bước 5: Test Complete Flow

#### A. Tạo user account
```bash
# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser", 
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

#### B. Login và tạo meeting
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Copy accessToken từ response, rồi tạo meeting
curl -X POST http://localhost:3000/api/v1/public-meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Test LiveKit Meeting",
    "description": "Testing SFU architecture",
    "settings": {
      "waiting_room": true,
      "allow_chat": true,
      "allow_screen_share": true
    }
  }'
```

#### C. Test LiveKit Token Generation
```bash
# Get LiveKit token for meeting
curl -X POST http://localhost:3000/api/v1/livekit/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "meetingId": "YOUR_MEETING_ID"
  }'
```

**Expected token response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "wsUrl": "wss://talkplatform-mqjtdg31.livekit.cloud",
  "identity": "user-123",
  "room": "meeting-YOUR_MEETING_ID",
  "metadata": {
    "role": "participant",
    "permissions": {...}
  },
  "waitingRoom": false
}
```

## 🎯 Test Frontend Flow

1. **Mở browser**: http://localhost:3001
2. **Register/Login** với account
3. **Tạo meeting** hoặc join meeting existing  
4. **Green Room**: Test camera/mic, chọn devices
5. **Join Meeting**: Verify LiveKit SFU connection
6. **Test features**:
   - Video/audio toggle
   - Screen sharing
   - Waiting room (nếu enabled)
   - Chat (data channel)

## 🐛 Troubleshooting

### Backend không khởi động được

```bash
# Kiểm tra port conflicts
netstat -an | findstr 3000

# Kiểm tra database connection
mysql -u root -p123456 -e "SELECT 1;"

# Kiểm tra Redis connection
redis-cli ping

# Check logs
npm run start:dev
```

### Frontend build errors

```bash
# Clean và reinstall
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

### LiveKit connection issues

```bash
# Test LiveKit Cloud connectivity
curl -I https://talkplatform-mqjtdg31.livekit.cloud

# Verify WebSocket
# Use browser DevTools -> Network -> WS tab
# Should see connection to wss://talkplatform-mqjtdg31.livekit.cloud
```

### Database connection errors

```bash
# Reset database (if needed)
mysql -u root -p123456 -e "DROP DATABASE IF EXISTS talkplatform; CREATE DATABASE talkplatform;"

# Re-run migrations
cd talkplatform-backend
npm run migration:run
```

## 📊 Success Indicators

✅ **Backend Ready:**
- `curl http://localhost:3000/api/v1/` returns response
- No database connection errors in console
- LiveKit token endpoint working

✅ **Frontend Ready:**
- http://localhost:3001 loads without errors
- Can register/login users
- Green Room loads with camera preview

✅ **LiveKit Integration:**
- Token generation successful  
- WebSocket connection to LiveKit Cloud
- Video/audio tracks functioning

✅ **Complete Flow:**
- Multiple users can join same meeting
- Waiting room controls working
- Screen share functional
- Real-time participant updates

---

**🎉 Khi tất cả success indicators đều ✅, bạn có production-ready video conferencing platform!**