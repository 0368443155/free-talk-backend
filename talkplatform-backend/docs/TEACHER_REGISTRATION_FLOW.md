# 📋 LUỒNG ĐĂNG KÝ LÀM GIÁO VIÊN (Teacher Registration Flow)

## 🎯 Tổng quan

Luồng đăng ký làm giáo viên được chia thành **2 giai đoạn chính**:
1. **Tạo Teacher Profile** - Đăng ký cơ bản và tạo hồ sơ giáo viên
2. **Xác minh KYC (Know Your Customer)** - Nộp tài liệu và chờ admin duyệt

---

## 📊 Sơ đồ luồng tổng quan

```
User (STUDENT)
    │
    ├─► [1] Click "Become a Teacher"
    │       │
    │       ├─► [2] Mở Modal: TeacherOnboardingModal
    │       │       │
    │       │       ├─► Nhập thông tin cơ bản:
    │       │       │   - Headline
    │       │       │   - Bio
    │       │       │   - Intro Video URL (optional)
    │       │       │   - Hourly Rate
    │       │       │
    │       │       └─► [3] Submit Form
    │       │               │
    │       │               ├─► POST /api/v1/teachers/me/become-teacher
    │       │               │   └─► Tạo TeacherProfile với status = PENDING
    │       │               │   └─► Update User.role = TEACHER
    │       │               │   └─► Generate Affiliate Code
    │       │               │
    │       │               └─► PATCH /api/v1/teachers/me/profile
    │       │                   └─► Update profile details
    │       │
    │       └─► [4] Redirect to /teacher/verification
    │               │
    │               ├─► [5] Upload Documents:
    │               │   - Identity Card (Front & Back)
    │               │   - Degree Certificates
    │               │   - Teaching Certificates
    │               │   - CV/Resume
    │               │
    │               ├─► [6] Fill Additional Info:
    │               │   - Years of Experience
    │               │   - Previous Platforms
    │               │   - References
    │               │
    │               └─► [7] POST /api/v1/teachers/verification/submit
    │                       │
    │                       ├─► Tạo/Update TeacherVerification
    │                       ├─► status = PENDING
    │                       └─► Lưu documents vào Storage (R2/Local)
    │
    └─► [8] Chờ Admin Duyệt
            │
            ├─► Admin xem hồ sơ tại /admin/teachers
            │
            ├─► [9a] APPROVE
            │       │
            │       ├─► PATCH /api/v1/teachers/verification/:id/approve
            │       │   └─► Update TeacherVerification.status = APPROVED
            │       │   └─► Update TeacherProfile.status = APPROVED
            │       │   └─► Update TeacherProfile.is_verified = true
            │       │   └─► Update User.role = TEACHER (nếu chưa)
            │       │
            │       └─► ✅ Teacher có thể:
            │           - Tạo Booking Slots
            │           - Nhận bookings từ students
            │           - Upload materials
            │           - Kiếm tiền từ classes
            │
            ├─► [9b] REJECT
            │       │
            │       ├─► PATCH /api/v1/teachers/verification/:id/reject
            │       │   └─► Update status = REJECTED
            │       │   └─► Lưu rejection_reason
            │       │
            │       └─► ❌ Teacher phải nộp lại hồ sơ
            │
            └─► [9c] REQUEST_INFO
                    │
                    ├─► PATCH /api/v1/teachers/verification/:id/request-info
                    │   └─► Update status = INFO_NEEDED
                    │   └─► Lưu admin_notes
                    │
                    └─► ⚠️ Teacher cần bổ sung thông tin
```

---

## 🔄 Chi tiết từng bước

### **Bước 1: Khởi tạo - User click "Become a Teacher"**

**Frontend:**
- Component: `BecomeTeacherButton`
- Location: Dashboard, Lobby, Teachers page
- Action: Mở modal `TeacherOnboardingModal`

**Điều kiện:**
- User phải đã đăng nhập (`JwtAuthGuard`)
- User role hiện tại: `STUDENT` (hoặc chưa có role)

---

### **Bước 2: Điền thông tin cơ bản**

**Component:** `TeacherOnboardingModal`

**Form fields:**
```typescript
{
  headline: string;           // VD: "IELTS 8.0 Tutor with 5 years experience"
  bio: string;                // Mô tả chi tiết về background, teaching style
  introVideoUrl?: string;     // URL video giới thiệu (optional)
  hourlyRate: number;          // Giá mỗi giờ dạy (credits)
}
```

**Validation:**
- `headline`: Required, max 500 chars
- `bio`: Required, min 50 chars
- `hourlyRate`: Required, min 1 credit

---

### **Bước 3: Submit Teacher Profile**

**API Call 1:** `POST /api/v1/teachers/me/become-teacher`

**Backend Service:** `TeachersService.becomeTeacher()`

**Logic:**
```typescript
1. Kiểm tra User tồn tại
2. Tạo TeacherProfile mới (nếu chưa có):
   - user_id = userId
   - status = PENDING
   - hourly_rate = 1 (default)
   - average_rating = 0
   - total_hours_taught = 0
   - is_verified = false
3. Generate unique Affiliate Code
4. Update User.affiliate_code
5. KHÔNG update User.role ở đây (sẽ update sau khi verify)
```

**Response:**
```json
{
  "user": { ... },
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "status": "pending",
    "is_verified": false,
    ...
  }
}
```

**API Call 2:** `PATCH /api/v1/teachers/me/profile`

**Backend Service:** `EnhancedTeachersService.updateTeacherProfile()`

**Logic:**
- Update các field: headline, bio, intro_video_url, hourly_rate_credits
- Lưu vào database

---

### **Bước 4: Chuyển đến trang Verification**

**Route:** `/teacher/verification`

**Component:** `TeacherVerificationPage`

**Mục đích:** Nộp tài liệu xác minh danh tính (KYC)

---

### **Bước 5: Upload Documents**

**Các tài liệu cần upload:**

1. **Identity Card (Bắt buộc)**
   - Front (mặt trước)
   - Back (mặt sau)
   - Format: JPG, PNG, PDF
   - Max size: 5MB mỗi file

2. **Degree Certificates (Tùy chọn)**
   - Bằng đại học, thạc sĩ, tiến sĩ
   - Có thể upload nhiều file
   - Mỗi file cần: name, year, issuer

3. **Teaching Certificates (Tùy chọn)**
   - TEFL, TESOL, CELTA, etc.
   - Có thể upload nhiều file
   - Mỗi file cần: name, issuer, year

4. **CV/Resume (Tùy chọn)**
   - File PDF hoặc DOCX
   - Max size: 10MB

**Upload Process:**
```typescript
1. User chọn file từ máy
2. Frontend gọi: getPresignedUploadUrlApi(key, mimeType)
   └─► Backend tạo pre-signed URL từ Storage Service
3. Frontend upload file trực tiếp lên Storage (R2/Local)
4. Lưu storage key vào state
5. Khi submit, gửi keys (không phải files) lên backend
```

**Storage Structure:**
```
verifications/
  {userId}/
    identity/
      front-{timestamp}.jpg
      back-{timestamp}.jpg
    degrees/
      {name}-{timestamp}.pdf
    certificates/
      {name}-{timestamp}.pdf
    cv/
      cv-{timestamp}.pdf
```

---

### **Bước 6: Điền thông tin bổ sung**

**Form fields:**

```typescript
{
  years_of_experience: number;        // Số năm kinh nghiệm
  previous_platforms?: string[];        // VD: ["iTalki", "Preply"]
  references?: Array<{                 // Người tham khảo
    name: string;
    email: string;
    relationship: string;              // "colleague", "supervisor", "student"
  }>;
}
```

---

### **Bước 7: Submit Verification**

**API:** `POST /api/v1/teachers/verification/submit`

**Backend Service:** `TeacherVerificationService.submitVerification()`

**Request Body:**
```typescript
{
  identity_card_front: string;        // Storage key
  identity_card_back: string;          // Storage key
  degree_certificates?: Array<{
    name: string;
    key: string;
    year?: number;
  }>;
  teaching_certificates?: Array<{
    name: string;
    issuer: string;
    key: string;
    year?: number;
  }>;
  cv_url?: string;                     // Storage key
  years_of_experience?: number;
  previous_platforms?: string[];
  references?: Array<{
    name: string;
    email: string;
    relationship: string;
  }>;
}
```

**Backend Logic:**
```typescript
1. Kiểm tra User tồn tại và là TEACHER
2. Kiểm tra đã có verification chưa:
   - Nếu có và status = APPROVED → throw error
   - Nếu có → Update
   - Nếu chưa → Create mới
3. Lưu documents vào JSONB field
4. Lưu additional_info vào JSONB field
5. Set status = PENDING
6. Set last_submitted_at = now()
7. Increment resubmission_count
8. Save to database
```

**Response:**
```json
{
  "id": "verification-uuid",
  "user_id": "user-uuid",
  "status": "pending",
  "documents": { ... },
  "additional_info": { ... },
  "created_at": "2024-01-01T00:00:00Z",
  "last_submitted_at": "2024-01-01T00:00:00Z"
}
```

**Frontend:**
- Hiển thị status badge: "Pending Review"
- Hiển thị message: "Your verification is under review. We'll notify you once it's processed."

---

### **Bước 8: Admin Review Process**

**Admin Dashboard:** `/admin/teachers`

**Admin có thể:**

1. **Xem danh sách verifications:**
   - Filter theo status: PENDING, UNDER_REVIEW, INFO_NEEDED, APPROVED, REJECTED
   - Sort theo created_at

2. **Xem chi tiết verification:**
   - Xem tất cả documents (download qua pre-signed URL)
   - Xem additional_info
   - Xem lịch sử resubmission

3. **Thực hiện action:**

   **a) APPROVE:**
   ```
   PATCH /api/v1/teachers/verification/:id/approve?notes=...
   ```
   **Logic:**
   ```typescript
   1. Update TeacherVerification:
      - status = APPROVED
      - reviewed_by = admin.id
      - verified_at = now()
      - admin_notes = notes
   
   2. Update TeacherProfile:
      - status = TeacherStatus.APPROVED
      - is_verified = true
   
   3. Update User:
      - role = UserRole.TEACHER (nếu chưa)
   
   4. Gửi email thông báo cho teacher
   ```

   **b) REJECT:**
   ```
   PATCH /api/v1/teachers/verification/:id/reject
   Body: { reason: "..." }
   ```
   **Logic:**
   ```typescript
   1. Update TeacherVerification:
      - status = REJECTED
      - reviewed_by = admin.id
      - rejection_reason = reason
   
   2. Update TeacherProfile:
      - status = TeacherStatus.REJECTED
      - is_verified = false
   
   3. Gửi email thông báo với lý do từ chối
   ```

   **c) REQUEST_INFO:**
   ```
   PATCH /api/v1/teachers/verification/:id/request-info
   Body: { notes: "Please provide..." }
   ```
   **Logic:**
   ```typescript
   1. Update TeacherVerification:
      - status = INFO_NEEDED
      - admin_notes = notes
   
   2. Gửi email yêu cầu bổ sung thông tin
   ```

---

### **Bước 9: Kết quả và Quyền hạn**

#### **✅ Khi được APPROVE:**

**Teacher có thể:**
- ✅ Tạo Booking Slots (`POST /api/v1/teachers/slots`)
- ✅ Nhận bookings từ students
- ✅ Upload teaching materials (`POST /api/v1/marketplace/teacher/materials`)
- ✅ Bán materials trên Marketplace
- ✅ Nhận credits từ classes và materials
- ✅ Xem analytics và earnings
- ✅ Sử dụng tất cả tính năng teacher

**Frontend:**
- Status badge: "Verified ✓"
- Hiển thị verified badge trên profile
- Unlock tất cả teacher features

#### **❌ Khi bị REJECT:**

**Teacher:**
- ❌ Không thể tạo booking slots
- ❌ Không thể nhận bookings
- ❌ Không thể upload materials
- ✅ Có thể nộp lại hồ sơ (resubmit)

**Frontend:**
- Status badge: "Rejected"
- Hiển thị rejection_reason
- Button "Resubmit Application"

#### **⚠️ Khi REQUEST_INFO:**

**Teacher:**
- ⚠️ Cần bổ sung thông tin theo admin_notes
- ⚠️ Có thể update và resubmit
- ❌ Chưa được unlock features

**Frontend:**
- Status badge: "Info Needed"
- Hiển thị admin_notes
- Button "Update & Resubmit"

---

## 🔐 Bảo mật và Quyền truy cập

### **Storage Security:**
- Documents được lưu trong **Private Bucket** (không public access)
- Chỉ Admin mới có thể tạo pre-signed download URL
- URL có thời gian hết hạn (expiresIn)

### **API Security:**
- Tất cả endpoints yêu cầu `JwtAuthGuard`
- Admin endpoints yêu cầu `RolesGuard` với `UserRole.ADMIN`
- Teacher chỉ có thể xem/modify verification của chính mình

### **Data Privacy:**
- Documents không được expose trực tiếp
- Chỉ lưu storage keys trong database
- Admin phải authenticate để xem documents

---

## 📊 Database Schema

### **TeacherProfile:**
```sql
- id: UUID
- user_id: UUID (FK → users)
- status: ENUM (pending, approved, rejected)
- is_verified: BOOLEAN
- headline: VARCHAR(500)
- bio: TEXT
- hourly_rate_credits: DECIMAL
- affiliate_code: VARCHAR(50)
- ...
```

### **TeacherVerification:**
```sql
- id: UUID
- user_id: UUID (FK → users, UNIQUE)
- status: ENUM (pending, under_review, info_needed, approved, rejected)
- documents: JSONB
- additional_info: JSONB
- admin_notes: TEXT
- rejection_reason: TEXT
- reviewed_by: UUID (FK → users)
- verified_at: TIMESTAMP
- resubmission_count: INT
- last_submitted_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

## 🔄 Resubmission Flow

Nếu verification bị **REJECT** hoặc **INFO_NEEDED**, teacher có thể:

1. Xem `admin_notes` hoặc `rejection_reason`
2. Update documents/info
3. Submit lại (`POST /api/v1/teachers/verification/submit`)
4. `resubmission_count` được increment
5. Status chuyển về `PENDING`
6. Admin review lại

**Lưu ý:** Không giới hạn số lần resubmit, nhưng có thể track qua `resubmission_count`.

---

## 📧 Email Notifications

**Khi APPROVE:**
```
Subject: Your Teacher Verification Has Been Approved! 🎉
Body: Congratulations! You can now start teaching...
```

**Khi REJECT:**
```
Subject: Teacher Verification Update
Body: Unfortunately, your verification was rejected. Reason: ...
```

**Khi REQUEST_INFO:**
```
Subject: Additional Information Required
Body: We need more information: ...
```

---

## 🎯 Use Cases

### **Use Case 1: New Teacher Registration**
```
Actor: Student
Goal: Become a verified teacher
Steps:
  1. Click "Become a Teacher"
  2. Fill basic profile
  3. Upload documents
  4. Submit verification
  5. Wait for approval
  6. Start teaching
```

### **Use Case 2: Admin Review**
```
Actor: Admin
Goal: Verify teacher identity
Steps:
  1. View pending verifications
  2. Download and review documents
  3. Check additional info
  4. Approve/Reject/Request Info
  5. System updates teacher status
```

### **Use Case 3: Resubmission**
```
Actor: Teacher (Rejected)
Goal: Fix issues and resubmit
Steps:
  1. View rejection reason
  2. Update documents/info
  3. Resubmit verification
  4. Wait for review again
```

---

## 🚀 Future Enhancements

1. **Automated Document Verification:**
   - OCR để đọc thông tin từ identity cards
   - AI để verify tính xác thực của certificates

2. **Background Check Integration:**
   - Tích hợp với third-party background check services
   - Tự động verify criminal records

3. **Multi-step Onboarding:**
   - Chia thành nhiều bước với progress bar
   - Save draft để tiếp tục sau

4. **Video Verification:**
   - Yêu cầu teacher quay video giới thiệu
   - Face matching với identity card

5. **Reference Verification:**
   - Tự động gửi email cho references
   - Collect feedback từ references

---

## 📝 Notes

- **Role Update:** User role được update thành `TEACHER` ngay sau khi tạo profile, nhưng chỉ được unlock features sau khi verification được approve.

- **Affiliate Code:** Mỗi teacher có một affiliate code duy nhất, được generate tự động khi tạo profile.

- **Storage:** Hiện tại hỗ trợ cả Local Storage và Cloud Storage (R2/S3), có thể switch qua config.

- **Audit Trail:** Mọi thay đổi status đều được log với `reviewed_by` và timestamp.

