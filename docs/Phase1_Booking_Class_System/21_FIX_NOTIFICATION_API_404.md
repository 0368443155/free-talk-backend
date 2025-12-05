# FIX: Notification API 404 Error

**Ngày fix:** 03/12/2025  
**Vấn đề:** API `/notifications` trả về 404  
**Trạng thái:** ✅ ĐÃ FIX

---

## 🐛 VẤN ĐỀ

### Lỗi

```
AxiosError: Request failed with status code 404
api\notifications.rest.ts (23:22) @ async Object.getNotifications
```

Frontend đang gọi:
```typescript
const response = await axiosConfig.get(`/notifications?limit=${limit}`);
```

Nhưng backend trả về 404.

---

## 🔍 NGUYÊN NHÂN

### Vấn đề

**`NotificationsController` đã được tạo nhưng CHƯA được đăng ký trong `NotificationsModule`!**

Controller file tồn tại tại:
- ✅ `talkplatform-backend/src/features/notifications/notifications.controller.ts`

Nhưng trong module:
- ❌ Không có `controllers: [NotificationsController]` trong `NotificationsModule`

---

## ✅ GIẢI PHÁP

### Đã thêm Controller vào Module

**File:** `talkplatform-backend/src/features/notifications/notifications.module.ts`

**Thay đổi:**

```typescript
import { NotificationsController } from './notifications.controller'; // ✅ Added

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    AuthModule,
  ],
  controllers: [NotificationsController], // ✅ Added
  providers: [NotificationService, NotificationProcessor, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationsModule { }
```

---

## 📋 API ENDPOINTS

Sau khi fix, các endpoints sau sẽ hoạt động:

### 1. GET /api/v1/notifications

Lấy danh sách notifications của user.

**Request:**
```bash
GET /api/v1/notifications?limit=50
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "type": "in_app",
    "title": "⏰ Class starting in 20 minutes",
    "message": "Your class will start in 20 minutes.",
    "status": "sent",
    "is_read": false,
    "action_url": "/meetings/123",
    "created_at": "2025-12-03T10:00:00Z"
  }
]
```

---

### 2. PATCH /api/v1/notifications/:id/read

Đánh dấu notification đã đọc.

**Request:**
```bash
PATCH /api/v1/notifications/{notificationId}/read
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "is_read": true,
  "read_at": "2025-12-03T10:05:00Z"
}
```

---

### 3. PATCH /api/v1/notifications/read-all

Đánh dấu tất cả notifications đã đọc.

**Request:**
```bash
PATCH /api/v1/notifications/read-all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "All notifications marked as read"
}
```

---

## 🧪 TESTING

### Test với cURL

```bash
# 1. Get notifications
curl -X GET "http://localhost:3000/api/v1/notifications?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Mark as read
curl -X PATCH "http://localhost:3000/api/v1/notifications/{id}/read" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Mark all as read
curl -X PATCH "http://localhost:3000/api/v1/notifications/read-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test với Frontend

Sau khi restart backend server, frontend sẽ tự động hoạt động:

1. **NotificationBell component** sẽ load được notifications
2. **Notifications page** sẽ hiển thị được danh sách
3. **Mark as read** sẽ hoạt động

---

## ⚠️ LƯU Ý

### Authentication

Tất cả endpoints đều yêu cầu authentication:
- Sử dụng `JwtAuthGuard`
- Cần gửi `Authorization: Bearer <token>` header

### Route Prefix

API endpoints có global prefix:
- Route: `/api/v1/notifications`
- Frontend axiosConfig đã có baseURL: `http://localhost:3000/api/v1`
- Frontend chỉ cần gọi: `/notifications`

---

## 🔄 NEXT STEPS

Sau khi fix:

1. **Restart Backend Server:**
   ```bash
   cd talkplatform-backend
   npm run start:dev
   ```

2. **Test Frontend:**
   - Refresh browser
   - Check notification bell
   - Verify notifications page

3. **Verify Logs:**
   - Check backend logs for route registration
   - Should see: `GET /api/v1/notifications` in logs

---

## ✅ VERIFICATION

Sau khi restart, kiểm tra:

### Backend Logs

Khi start server, bạn sẽ thấy routes được register. Hoặc test bằng cách gọi API trực tiếp.

### Frontend

1. Open browser console
2. Check Network tab
3. Call to `/api/v1/notifications` should return 200 (not 404)

---

## 📝 SUMMARY

**Vấn đề:** Controller chưa được đăng ký trong module  
**Fix:** Thêm `NotificationsController` vào `NotificationsModule.controllers`  
**Status:** ✅ FIXED

**Files changed:**
- `talkplatform-backend/src/features/notifications/notifications.module.ts`

---

**Fixed by:** AI Assistant  
**Date:** 03/12/2025  
**Version:** 1.0.0

