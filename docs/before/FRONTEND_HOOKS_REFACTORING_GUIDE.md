# 🎯 FRONTEND HOOKS REFACTORING - Tổng Hợp & Lộ Trình

**Ngày tạo:** 2025-12-01  
**Mục đích:** Tách tất cả chức năng thành hooks tái sử dụng

---

## 📋 PHẦN 1: TỔNG HỢP CHỨC NĂNG TOÀN HỆ THỐNG

### 1. MEETING ROOM (Phòng Họp)

#### 1.1 Media Controls
```typescript
useCamera(roomId)           // Bật/tắt camera
useMicrophone(roomId)       // Bật/tắt mic
useScreenShare(roomId)      // Chia sẻ màn hình
useSpeaker(roomId)          // Điều chỉnh loa
useDeviceSelection()        // Chọn thiết bị (camera/mic/speaker)
useMediaPermissions()       // Xin quyền truy cập media
```

#### 1.2 Room Controls
```typescript
useRoomLock(roomId)         // Khóa/mở phòng
useRoomLeave(roomId)        // Rời phòng
useRoomRefresh(roomId)      // Làm mới phòng
useRoomSettings(roomId)     // Cài đặt phòng
useWaitingRoom(roomId)      // Phòng chờ
```

#### 1.3 Participants
```typescript
useParticipants(roomId)     // Danh sách người tham gia
useParticipantKick(roomId)  // Kick người dùng
useParticipantMute(roomId)  // Mute người dùng
useHandRaise(roomId)        // Giơ tay
useReactions(roomId)        // Reactions (emoji)
```

#### 1.4 Communication
```typescript
useChat(roomId)             // Chat messages
useChatTyping(roomId)       // Typing indicator
useChatReactions(roomId)    // React to messages
usePrivateMessage(roomId)   // Tin nhắn riêng
```

#### 1.5 Content Sharing
```typescript
useYouTubePlayer(roomId)    // YouTube player sync
useWhiteboard(roomId)       // Bảng trắng
useFileShare(roomId)        // Chia sẻ file
usePoll(roomId)             // Tạo poll/khảo sát
```

#### 1.6 Recording & Analytics
```typescript
useRecording(roomId)        // Ghi hình
useTranscription(roomId)    // Phiên âm
useAnalytics(roomId)        // Thống kê
```

---

### 2. COURSE MANAGEMENT (Quản Lý Khóa Học)

#### 2.1 Course CRUD
```typescript
useCourseCreate()           // Tạo khóa học
useCourseUpdate(courseId)   // Cập nhật khóa học
useCourseDelete(courseId)   // Xóa khóa học
useCoursePublish(courseId)  // Xuất bản khóa học
useCourseDraft(courseId)    // Lưu nháp
```

#### 2.2 Course Data
```typescript
useCourse(courseId)         // Lấy thông tin khóa học
useCourses(filters)         // Danh sách khóa học
useMyCourses()              // Khóa học của tôi
useCourseSearch(query)      // Tìm kiếm khóa học
```

#### 2.3 Sessions
```typescript
useSessionCreate(courseId)  // Tạo buổi học
useSessionUpdate(sessionId) // Cập nhật buổi học
useSessionDelete(sessionId) // Xóa buổi học
useSessions(courseId)       // Danh sách buổi học
```

#### 2.4 Lessons
```typescript
useLessonCreate(sessionId)  // Tạo bài học
useLessonUpdate(lessonId)   // Cập nhật bài học
useLessonDelete(lessonId)   // Xóa bài học
useLessons(sessionId)       // Danh sách bài học
```

---

### 3. ENROLLMENT (Đăng Ký Học)

```typescript
useEnroll(courseId)         // Đăng ký khóa học
useEnrollSession(sessionId) // Đăng ký buổi học
useMyEnrollments()          // Khóa học đã đăng ký
useEnrollmentCancel(id)     // Hủy đăng ký
useEnrollmentStatus(id)     // Trạng thái đăng ký
```

---

### 4. PAYMENT & CREDITS (Thanh Toán)

#### 4.1 Credits
```typescript
useCreditBalance()          // Số dư credit
useCreditPurchase()         // Mua credit
useCreditHistory()          // Lịch sử giao dịch
useCreditTransfer()         // Chuyển credit
```

#### 4.2 Payments
```typescript
usePaymentMethods()         // Phương thức thanh toán
usePaymentProcess()         // Xử lý thanh toán
usePaymentHistory()         // Lịch sử thanh toán
useRefund(paymentId)        // Hoàn tiền
```

#### 4.3 Wallet
```typescript
useWallet()                 // Ví tiền
useWithdraw()               // Rút tiền
useDeposit()                // Nạp tiền
useWalletHistory()          // Lịch sử ví
```

---

### 5. BOOKING (Đặt Lịch)

```typescript
useBookingCreate()          // Tạo booking
useBookingCancel(id)        // Hủy booking
useMyBookings()             // Booking của tôi
useAvailableSlots(teacherId)// Lịch trống
useBookingConfirm(id)       // Xác nhận booking
```

---

### 6. MARKETPLACE (Chợ Tài Liệu)

```typescript
useMaterials(filters)       // Danh sách tài liệu
useMaterialUpload()         // Upload tài liệu
useMaterialPurchase(id)     // Mua tài liệu
useMyMaterials()            // Tài liệu của tôi
useMaterialDownload(id)     // Tải tài liệu
```

---

### 7. USER PROFILE (Hồ Sơ)

```typescript
useProfile()                // Thông tin cá nhân
useProfileUpdate()          // Cập nhật profile
useAvatar()                 // Avatar
useSettings()               // Cài đặt
useNotifications()          // Thông báo
```

---

### 8. TEACHER (Giáo Viên)

```typescript
useTeacherVerification()    // Xác minh giáo viên
useTeacherProfile(id)       // Profile giáo viên
useTeacherStats()           // Thống kê giáo viên
useTeacherReviews(id)       // Đánh giá
useTeacherAvailability()    // Lịch rảnh
```

---

### 9. AUTHENTICATION (Xác Thực)

```typescript
useAuth()                   // Đăng nhập/đăng xuất
useRegister()               // Đăng ký
usePasswordReset()          // Quên mật khẩu
useEmailVerification()      // Xác thực email
useSession()                // Session hiện tại
```

---

### 10. GLOBAL FEATURES (Chức Năng Chung)

```typescript
useToast()                  // Thông báo toast
useModal()                  // Modal dialog
useLoading()                // Loading state
useDebounce(value)          // Debounce
useLocalStorage(key)        // Local storage
useWebSocket(url)           // WebSocket connection
```

---

## 📊 PHẦN 2: LỘ TRÌNH REFACTOR HOOKS

### GIAI ĐOẠN 1: Foundation Hooks (Tuần 1)
**Mục tiêu:** Tạo các hooks cơ bản nhất

#### Priority 1: Core Hooks
```typescript
// 1.1 API Hooks
useApi()                    // Base API hook
useMutation()               // Mutation hook
useQuery()                  // Query hook

// 1.2 State Management
useGlobalState()            // Global state
useLocalState()             // Local state
usePersistentState()        // Persistent state

// 1.3 Utilities
useDebounce()
useThrottle()
useLocalStorage()
useSessionStorage()
```

**Deliverables:**
- [ ] 10 foundation hooks
- [ ] Unit tests
- [ ] Documentation

---

### GIAI ĐOẠN 2: Authentication & User (Tuần 2)
**Mục tiêu:** Hooks liên quan đến user

```typescript
useAuth()
useProfile()
useSettings()
useNotifications()
```

**Deliverables:**
- [ ] 4 auth hooks
- [ ] Integration tests
- [ ] Examples

---

### GIAI ĐOẠN 3: Meeting Room Core (Tuần 3-4)
**Mục tiêu:** Hooks cho phòng họp

#### Week 3: Media & Controls
```typescript
useCamera()
useMicrophone()
useScreenShare()
useSpeaker()
useDeviceSelection()
useRoomLock()
useRoomLeave()
```

#### Week 4: Communication & Content
```typescript
useParticipants()
useChat()
useYouTubePlayer()
useWhiteboard()
useHandRaise()
useReactions()
```

**Deliverables:**
- [ ] 13 meeting hooks
- [ ] Integration with LiveKit
- [ ] E2E tests

---

### GIAI ĐOẠN 4: Course Management (Tuần 5)
**Mục tiêu:** Hooks cho quản lý khóa học

```typescript
useCourse()
useCourses()
useSessionCreate()
useLessonCreate()
useEnroll()
```

**Deliverables:**
- [ ] 10 course hooks
- [ ] CRUD operations
- [ ] Validation

---

### GIAI ĐOẠN 5: Payment & Booking (Tuần 6)
**Mục tiêu:** Hooks cho thanh toán

```typescript
useCreditBalance()
usePaymentProcess()
useBookingCreate()
useWallet()
```

**Deliverables:**
- [ ] 8 payment hooks
- [ ] Payment integration
- [ ] Error handling

---

### GIAI ĐOẠN 6: Advanced Features (Tuần 7)
**Mục tiêu:** Hooks nâng cao

```typescript
useRecording()
useTranscription()
useAnalytics()
useMaterialUpload()
```

**Deliverables:**
- [ ] 6 advanced hooks
- [ ] Third-party integrations
- [ ] Performance optimization

---

## 🔍 PHẦN 3: GIẢI THÍCH REFACTOR BACKEND (Đã Làm)

### Backend Refactor Đã Làm GÌ:

#### 1. **Tách Monolithic Gateway → Modular Gateways**

**Trước:**
```typescript
// meetings.gateway.ts (831 lines) ❌
@WebSocketGateway()
class MeetingsGateway {
  handleOffer()      // WebRTC
  handleChat()       // Chat
  handleYouTube()    // YouTube
  handleKick()       // Moderation
  // ... 50+ methods
}
```

**Sau:**
```typescript
// UnifiedRoomGateway (< 200 lines) ✅
class UnifiedRoomGateway {
  handleJoinRoom()
  handleLeaveRoom()
}

// ChatGateway (< 150 lines) ✅
class ChatGateway {
  handleSendMessage()
  handleTyping()
}

// MediaGateway (< 100 lines) ✅
class MediaGateway {
  handleToggleAudio()
  handleToggleVideo()
}
```

**Lợi ích:**
- ✅ Mỗi gateway < 200 lines (dễ đọc)
- ✅ Tách biệt concerns
- ✅ Dễ test
- ✅ Dễ maintain

---

#### 2. **Tách Large Service → CQRS Pattern**

**Trước:**
```typescript
// courses.service.ts (1,056 lines) ❌
class CoursesService {
  createCourse()     // 50 lines
  getCourses()       // 60 lines
  updateCourse()     // 40 lines
  publishCourse()    // 55 lines
  // ... 20+ methods
}
```

**Sau:**
```typescript
// Command (Write operations)
class CreateCourseHandler {
  execute(command) { /* 30 lines */ }
}

class PublishCourseHandler {
  execute(command) { /* 25 lines */ }
}

// Query (Read operations)
class GetCoursesHandler {
  execute(query) { /* 40 lines */ }
}

class GetCourseDetailsHandler {
  execute(query) { /* 35 lines */ }
}
```

**Lợi ích:**
- ✅ Mỗi handler < 50 lines
- ✅ Single responsibility
- ✅ Dễ scale (read/write riêng)
- ✅ Event sourcing ready

---

#### 3. **Tạo Core Modules (Shared Logic)**

**Trước:**
```typescript
// Duplicate code everywhere ❌
class CoursesService {
  validateEnrollment() { /* 70 lines */ }
}

class MeetingsService {
  validateEnrollment() { /* 70 lines - DUPLICATE */ }
}
```

**Sau:**
```typescript
// Core module (Reusable) ✅
class AccessControlService {
  validateEnrollment() { /* 70 lines - ONCE */ }
}

// Use everywhere
class CoursesService {
  constructor(private accessControl: AccessControlService) {}
  
  async enroll() {
    await this.accessControl.validateEnrollment();
  }
}
```

**Lợi ích:**
- ✅ No duplication
- ✅ Centralized logic
- ✅ Easy to update

---

#### 4. **Feature Modules (Tách Chức Năng)**

**Trước:**
```typescript
// All in one gateway ❌
class MeetingsGateway {
  handleChat()
  handleYouTube()
  handleWhiteboard()
  handlePoll()
  // All mixed together
}
```

**Sau:**
```typescript
// Separate feature modules ✅
src/features/room-features/
├── chat/           // Chat module
├── youtube-sync/   // YouTube module
├── whiteboard/     // Whiteboard module
└── polls/          // Poll module
```

**Lợi ích:**
- ✅ Plug & play features
- ✅ Easy to enable/disable
- ✅ Independent development

---

#### 5. **Room Types (Flexible Configuration)**

**Trước:**
```typescript
// Hard-coded room types ❌
if (roomType === 'free_talk') {
  // 100 lines of logic
} else if (roomType === 'lesson') {
  // 150 lines of logic
}
```

**Sau:**
```typescript
// Configuration-based ✅
const FREE_TALK_CONFIG = {
  features: [CHAT, VIDEO, AUDIO],
  maxParticipants: 4,
  requiresPayment: false,
};

const LESSON_CONFIG = {
  features: [CHAT, VIDEO, AUDIO, WHITEBOARD, RECORDING],
  maxParticipants: 30,
  requiresPayment: true,
};

// Factory creates room based on config
const room = roomFactory.create(FREE_TALK_CONFIG);
```

**Lợi ích:**
- ✅ Easy to add new room types
- ✅ Configuration over code
- ✅ Flexible

---

## 🎯 PHẦN 4: SO SÁNH BACKEND vs FRONTEND REFACTOR

### Backend Refactor (Đã Làm):
```
Mục đích: Tách code BACKEND thành modules nhỏ
Đối tượng: NestJS services, gateways, controllers
Kết quả: 
  - Gateway: 831 lines → < 200 lines
  - Service: 1,056 lines → < 50 lines/handler
  - Modular architecture
```

### Frontend Refactor (Cần Làm):
```
Mục đích: Tách code FRONTEND thành hooks nhỏ
Đối tượng: React hooks, components
Kết quả mong muốn:
  - useMeeting: 500 lines → 10 hooks x 50 lines
  - Reusable hooks
  - Clean components
```

---

## ✅ PHẦN 5: CHECKLIST IMPLEMENTATION

### Foundation (Tuần 1)
- [ ] Create `hooks/` directory structure
- [ ] Implement base hooks (useApi, useMutation, useQuery)
- [ ] Setup testing framework
- [ ] Write documentation

### Authentication (Tuần 2)
- [ ] useAuth hook
- [ ] useProfile hook
- [ ] Integration tests
- [ ] Update login/register pages

### Meeting Room (Tuần 3-4)
- [ ] Media hooks (camera, mic, screen)
- [ ] Communication hooks (chat, participants)
- [ ] Content hooks (youtube, whiteboard)
- [ ] Update meeting room component

### Course Management (Tuần 5)
- [ ] Course CRUD hooks
- [ ] Session/Lesson hooks
- [ ] Enrollment hooks
- [ ] Update course pages

### Payment & Booking (Tuần 6)
- [ ] Payment hooks
- [ ] Booking hooks
- [ ] Wallet hooks
- [ ] Update payment pages

### Advanced Features (Tuần 7)
- [ ] Recording hooks
- [ ] Analytics hooks
- [ ] Marketplace hooks
- [ ] Final testing

---

## 📊 KẾT LUẬN

### Backend Refactor (Đã Xong):
- ✅ Tách backend thành modules
- ✅ CQRS pattern
- ✅ Feature modules
- ✅ Room types
- ✅ Giảm code duplication

### Frontend Refactor (Cần Làm):
- ⏳ Tách frontend thành hooks
- ⏳ Reusable components
- ⏳ Clean architecture
- ⏳ Better maintainability

**Timeline:** 7 tuần để hoàn thành frontend hooks refactoring

**Lợi ích:**
- Code dễ đọc, dễ maintain
- Tái sử dụng cao
- Testing dễ dàng
- Onboarding nhanh cho dev mới
