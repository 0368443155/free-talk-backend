# Refactoring Referral System - Mã Giới Thiệu và Link Chỉ Cho Giáo Viên

**Ngày:** 2025-01-03  
**Status:** 📋 DOCUMENTATION - Chờ Review  
**Mục đích:** Chỉnh sửa hệ thống referral để chỉ giáo viên mới có referral link, và user đăng ký nhập mã referral

---

## 🎯 YÊU CẦU MỚI

### 1. **Referral Link Chỉ Cho Giáo Viên**
- ✅ Referral link (`affiliate_code`) chỉ được tạo khi:
  - User đăng ký làm **giáo viên** (teacher)
  - Và được **chấp nhận/verified** (teacher verification status = approved)
- ❌ Student đăng ký bình thường **KHÔNG** được tạo referral link

### 2. **Đăng Ký Nhập Mã Referral**
- ✅ Form đăng ký có field: **"Referral Code"** (optional)
- ✅ User có thể nhập mã giới thiệu (ví dụ: `ABC123`)
- ✅ Mã có thể **null** (không bắt buộc)
- ✅ Validate mã referral có tồn tại và là của giáo viên đã được verify

### 3. **Tracking Referral**
- ✅ Lưu `referrer_id` cho user mới đăng ký (nếu có mã referral hợp lệ)
- ✅ Đánh dấu user được giới thiệu bởi giáo viên nào
- ✅ Revenue sharing vẫn hoạt động như hiện tại (10% platform / 90% teacher)

---

## 📊 SỰ THAY ĐỔI SO VỚI HIỆN TẠI

### **Hiện Tại (Cần Sửa)**
```
Student đăng ký → Tự động tạo affiliate_code → Có referral link ngay
Dashboard: Hiển thị referral link (http://localhost:3001/register?ref=ABC123)
Form đăng ký: Có referral link (từ URL param ?ref=...)
```

### **Mới (Cần Implement)**
```
Student đăng ký → KHÔNG tạo affiliate_code
Giáo viên đăng ký + Verified → Tạo affiliate_code → Chỉ có mã code
Dashboard: Chỉ hiển thị mã code (ABC123), không hiển thị link
Form đăng ký: Có input field "Referral Code" (nhập mã, không phải link)
```

---

## 🏗️ KIẾN TRÚC THAY ĐỔI

### **1. User Registration Flow**

```
┌─────────────────────────────────────────────────┐
│  User Đăng Ký (Student hoặc Teacher)            │
└──────────────┬──────────────────────────────────┘
               │
               ├─► Nhập thông tin: email, username, password
               ├─► Nhập Referral Code (optional): [ABC123]
               │
               ├─► Validate Referral Code:
               │   ├─► Code tồn tại?
               │   ├─► Code là của giáo viên?
               │   └─► Giáo viên đã được verify?
               │
               ├─► Create User:
               │   ├─► role: STUDENT hoặc TEACHER
               │   ├─► referrer_id: (nếu có mã hợp lệ)
               │   └─► affiliate_code: NULL (sẽ tạo sau nếu là teacher)
               │
               └─► Nếu là TEACHER:
                   └─► Chờ verification
                       └─► Khi verified → Tạo affiliate_code
```

### **2. Teacher Verification Flow**

```
┌─────────────────────────────────────────────────┐
│  Teacher Verification (Admin/System)            │
└──────────────┬──────────────────────────────────┘
               │
               ├─► Admin verify teacher profile
               │
               ├─► Update teacher verification status = APPROVED
               │
               ├─► Check nếu chưa có affiliate_code:
               │   └─► Auto-generate unique affiliate_code
               │       └─► Update user.affiliate_code
               │
               └─► Teacher giờ có referral code:
                   └─► ABC123 (chỉ hiển thị mã)
```

### **3. Affiliate Dashboard Flow**

```
┌─────────────────────────────────────────────────┐
│  Affiliate Dashboard                            │
└──────────────┬──────────────────────────────────┘
               │
               ├─► Chỉ giáo viên đã verified mới truy cập được
               │
               ├─► Hiển thị referral code (chỉ mã):
               │   └─► ABC123 (không hiển thị full link)
               │
               ├─► Stats, referrals list, earnings như hiện tại
               │
               └─► Student truy cập → Redirect hoặc hiển thị message
```

---

## 📝 CHI TIẾT IMPLEMENTATION

### **Phase 1: Backend Changes**

#### **1.1. Update User Entity**

```typescript
// src/users/user.entity.ts

@Column({ type: 'char', length: 20, nullable: true, unique: true })
affiliate_code: string;

// THAY ĐỔI:
// - affiliate_code chỉ được set khi teacher được verified
// - Không tự động tạo khi đăng ký student
```

#### **1.2. Update UsersService**

**File:** `src/users/users.service.ts`

**Thay đổi `createStudent()`:**
```typescript
async createStudent(dto: CreateStudentDto): Promise<User> {
  // ... existing validation ...
  
  // Find referrer by referral code (nếu có)
  let referrer: User | null = null;
  if (dto.referralCode) {
    referrer = await this.usersRepository.findOne({
      where: { affiliate_code: dto.referralCode },
      relations: ['teacherProfile'],
    });
    
    // Validate referrer:
    // 1. Tồn tại
    // 2. Là giáo viên (role = TEACHER)
    // 3. Teacher profile đã được verify
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }
    
    if (referrer.role !== UserRole.TEACHER) {
      throw new BadRequestException('Referral code is not from a verified teacher');
    }
    
    if (referrer.teacherProfile?.verification_status !== 'approved') {
      throw new BadRequestException('Referral code is not from a verified teacher');
    }
  }
  
  // Tạo user KHÔNG tạo affiliate_code cho student
  const user = this.usersRepository.create({
    email,
    username,
    password,
    role: UserRole.STUDENT,
    referrer_id: referrer ? referrer.id : undefined,
    // KHÔNG set affiliate_code ở đây
    // affiliate_code: null (default)
  });
  
  await this.usersRepository.save(user);
  return user;
}
```

**Thêm method `createTeacher()` hoặc update existing:**
```typescript
async createTeacher(dto: CreateTeacherDto): Promise<User> {
  // Tạo teacher nhưng CHƯA tạo affiliate_code
  // affiliate_code sẽ được tạo khi teacher được verify
  
  const user = this.usersRepository.create({
    // ... teacher data ...
    role: UserRole.TEACHER,
    affiliate_code: null, // Chưa có
    // ... referral code tracking nếu có ...
  });
  
  return user;
}
```

**Thêm method `generateAffiliateCodeForTeacher()`:**
```typescript
async generateAffiliateCodeForTeacher(teacherId: string): Promise<string> {
  const teacher = await this.usersRepository.findOne({
    where: { id: teacherId },
    relations: ['teacherProfile'],
  });
  
  if (!teacher) {
    throw new NotFoundException('Teacher not found');
  }
  
  if (teacher.role !== UserRole.TEACHER) {
    throw new BadRequestException('User is not a teacher');
  }
  
  if (teacher.teacherProfile?.verification_status !== 'approved') {
    throw new BadRequestException('Teacher is not verified');
  }
  
  // Nếu đã có affiliate_code, return existing
  if (teacher.affiliate_code) {
    return teacher.affiliate_code;
  }
  
  // Generate unique affiliate code
  const affiliateCode = await this.generateUniqueAffiliateCode(
    teacher.username || teacher.email
  );
  
  teacher.affiliate_code = affiliateCode;
  await this.usersRepository.save(teacher);
  
  return affiliateCode;
}
```

#### **1.3. Update Teacher Verification Service**

**File:** `src/features/teachers/teacher-verification.service.ts` (hoặc tương tự)

Khi teacher được verify:

```typescript
async approveTeacher(teacherId: string) {
  // ... existing verification logic ...
  
  // Update verification status
  teacherProfile.verification_status = 'approved';
  await this.teacherProfileRepository.save(teacherProfile);
  
  // Auto-generate affiliate code for teacher
  await this.usersService.generateAffiliateCodeForTeacher(teacherId);
  
  // ... other logic ...
}
```

#### **1.4. Update Affiliate Service**

**File:** `src/features/affiliate/affiliate.service.ts`

**Update `getStats()`:**
```typescript
async getStats(userId: string): Promise<AffiliateStatsDto> {
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['teacherProfile'],
  });
  
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  // Chỉ giáo viên đã verified mới có affiliate_code
  if (user.role !== UserRole.TEACHER) {
    throw new ForbiddenException('Only verified teachers can access affiliate dashboard');
  }
  
  if (!user.teacherProfile || user.teacherProfile.verification_status !== 'approved') {
    throw new ForbiddenException('Only verified teachers can access affiliate dashboard');
  }
  
  // Nếu chưa có affiliate_code (edge case), tạo ngay
  if (!user.affiliate_code) {
    user.affiliate_code = await this.generateUniqueAffiliateCode(user.username || user.email);
    await this.userRepository.update(userId, { affiliate_code: user.affiliate_code });
  }
  
  // ... rest of existing logic (total_referrals, earnings, etc.) ...
  
  // Return chỉ affiliate_code, KHÔNG return referral_link
  return {
    total_referrals: totalReferrals,
    total_earnings: totalEarnings,
    this_month_earnings: thisMonthEarnings,
    recent_referrals: recentReferrals.map(...),
    referral_code: user.affiliate_code, // Chỉ trả về code, không phải link
  };
}
```

#### **1.5. Update DTOs**

**File:** `src/auth/dto/create-student.dto.ts`

```typescript
export class CreateStudentDto {
  // ... existing fields ...
  
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Referral code cannot be longer than 20 characters' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Referral code must contain only uppercase letters and numbers' })
  referralCode?: string; // Changed from referralCode to be optional
}
```

**Thêm Validate Referral Code Endpoint:**

**File:** `src/features/affiliate/affiliate.controller.ts`

```typescript
@Get('validate-code/:code')
@ApiOperation({ summary: 'Validate referral code (public endpoint)' })
@ApiResponse({ status: 200, description: 'Referral code validation result' })
async validateReferralCode(@Param('code') code: string): Promise<{
  valid: boolean;
  message?: string;
  referrer_name?: string;
}> {
  return this.affiliateService.validateReferralCodePublic(code);
}
```

**File:** `src/features/affiliate/affiliate.service.ts`

```typescript
async validateReferralCodePublic(code: string): Promise<{
  valid: boolean;
  message?: string;
  referrer_name?: string;
}> {
  if (!code) {
    return {
      valid: false,
      message: 'Referral code is required',
    };
  }
  
  const referrer = await this.userRepository.findOne({
    where: { affiliate_code: code },
    relations: ['teacherProfile'],
  });
  
  if (!referrer) {
    return {
      valid: false,
      message: 'Invalid referral code',
    };
  }
  
  // Validate là giáo viên và đã được verify
  if (referrer.role !== UserRole.TEACHER) {
    return {
      valid: false,
      message: 'Referral code is not from a verified teacher',
    };
  }
  
  if (!referrer.teacherProfile || referrer.teacherProfile.verification_status !== 'approved') {
    return {
      valid: false,
      message: 'Referral code is not from a verified teacher',
    };
  }
  
  return {
    valid: true,
    referrer_name: referrer.username,
  };
}
```

---

### **Phase 2: Frontend Changes**

#### **2.1. Update Register Page**

**File:** `talkplatform-frontend/app/register/page.tsx`

**Thay đổi:**
- ❌ Bỏ logic đọc referral code từ URL param `?ref=...`
- ✅ Thêm input field "Referral Code" (optional)
- ✅ Validate referral code khi user nhập (call API validate)
- ✅ Hiển thị thông tin giáo viên giới thiệu nếu mã hợp lệ

```typescript
// Pseudo code
const [referralCode, setReferralCode] = useState('');
const [referralValid, setReferralValid] = useState(false);
const [referrerName, setReferrerName] = useState('');

const validateReferralCode = async (code: string) => {
  if (!code) {
    setReferralValid(false);
    return;
  }
  
  try {
    const result = await validateReferralCodeApi(code);
    if (result.valid) {
      setReferralValid(true);
      setReferrerName(result.referrer_name);
    } else {
      setReferralValid(false);
      // Show error message
    }
  } catch (error) {
    setReferralValid(false);
  }
};

// Form field
<Input
  label="Referral Code (Optional)"
  value={referralCode}
  onChange={(e) => {
    setReferralCode(e.target.value.toUpperCase());
    validateReferralCode(e.target.value);
  }}
  placeholder="Enter referral code (e.g. ABC123)"
/>

{referralValid && referrerName && (
  <div className="text-green-600">
    ✓ Referred by {referrerName}
  </div>
)}

{referralCode && !referralValid && (
  <div className="text-red-600">
    Invalid referral code
  </div>
)}
```

**Update registration API call:**
```typescript
const handleSubmit = async () => {
  const payload = {
    email,
    username,
    password,
    referralCode: referralCode || undefined, // Send only if provided
  };
  
  await registerApi(payload);
};
```

#### **2.2. Update Affiliate Dashboard - Hiển Thị Chỉ Mã Code**

**File:** `talkplatform-frontend/app/dashboard/affiliate/page.tsx`

**Update hiển thị referral code (không phải link):**
```typescript
// Thay vì hiển thị link:
// ❌ {stats.referral_link}

// Hiển thị chỉ mã code:
✅ <div>
     <label>Your Referral Code:</label>
     <code className="text-xl font-bold">{stats.referral_code}</code>
     <Button onClick={copyCode}>Copy Code</Button>
   </div>

// Copy code thay vì copy link
const copyCode = () => {
  navigator.clipboard.writeText(stats.referral_code);
  toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
};
```

**Thêm check access:**
```typescript
useEffect(() => {
  // Check if user is verified teacher
  const checkAccess = async () => {
    try {
      const user = await getCurrentUserApi();
      
      if (user.role !== 'teacher') {
        router.push('/dashboard');
        toast({
          title: 'Access Denied',
          description: 'Only verified teachers can access affiliate dashboard',
          variant: 'destructive',
        });
        return;
      }
      
      // Load dashboard...
    } catch (error) {
      // Handle error
    }
  };
  
  checkAccess();
}, []);
```

#### **2.3. Update API Client**

**File:** `talkplatform-frontend/api/affiliate.rest.ts`

**Thêm:**
```typescript
export const validateReferralCodeApi = async (code: string): Promise<{
  valid: boolean;
  message?: string;
  referrer_name?: string;
}> => {
  const response = await axiosConfig.get(`/affiliate/validate-code/${code}`);
  return response.data;
};
```

---

## 🗄️ DATABASE CHANGES

### **Migration: Không cần thay đổi schema**

Schema hiện tại đã phù hợp:
- `users.affiliate_code` - nullable (đã có)
- `users.referrer_id` - nullable (đã có)
- `teacher_profiles.verification_status` - đã có

**Chỉ cần update data:**
- Xóa `affiliate_code` khỏi các student hiện tại (nếu có)
- Giữ `affiliate_code` cho teacher đã verified

**Migration script (optional):**
```sql
-- Xóa affiliate_code của các student (không phải teacher)
UPDATE users 
SET affiliate_code = NULL 
WHERE role = 'student' AND affiliate_code IS NOT NULL;

-- Đảm bảo teacher chưa verified không có affiliate_code
UPDATE users u
LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
SET u.affiliate_code = NULL
WHERE u.role = 'teacher' 
AND (tp.verification_status IS NULL OR tp.verification_status != 'approved')
AND u.affiliate_code IS NOT NULL;
```

---

## ✅ CHECKLIST IMPLEMENTATION

### **Backend:**
- [ ] Update `UsersService.createStudent()` - không tạo affiliate_code
- [ ] Update `UsersService.createTeacher()` - không tạo affiliate_code
- [ ] Thêm `UsersService.generateAffiliateCodeForTeacher()`
- [ ] Update Teacher Verification Service - auto-generate affiliate_code khi verify
- [ ] Update `AffiliateService.getStats()` - check teacher verified
- [ ] Thêm `AffiliateService.validateReferralCodePublic()`
- [ ] Thêm endpoint `GET /affiliate/validate-code/:code`
- [ ] Update `CreateStudentDto` - referralCode optional với validation
- [ ] Test referral code validation
- [ ] Test teacher verification flow

### **Frontend:**
- [ ] Update Register page - thêm input field "Referral Code"
- [ ] Implement validate referral code (call API)
- [ ] Hiển thị thông tin giáo viên giới thiệu
- [ ] Bỏ logic đọc referral từ URL param
- [ ] Update API client - thêm `validateReferralCodeApi`
- [ ] Update Affiliate Dashboard - check access (verified teacher only)
- [ ] Test register với referral code
- [ ] Test register không có referral code

### **Database:**
- [ ] Migration: Xóa affiliate_code của student
- [ ] Migration: Xóa affiliate_code của teacher chưa verified
- [ ] Verify schema đầy đủ

### **Testing:**
- [ ] Test student đăng ký không có referral code
- [ ] Test student đăng ký có referral code hợp lệ
- [ ] Test student đăng ký có referral code không hợp lệ
- [ ] Test teacher đăng ký → verify → có affiliate_code
- [ ] Test teacher chưa verified → không có affiliate_code
- [ ] Test affiliate dashboard chỉ teacher verified mới truy cập được
- [ ] Test revenue sharing vẫn hoạt động đúng

---

## 🚨 BREAKING CHANGES

### **1. Student không còn referral code**
- ⚠️ Student đăng ký trước đây có affiliate_code → sẽ bị xóa
- ✅ Không ảnh hưởng đến data hiện tại (chỉ ảnh hưởng logic mới)

### **4. Dashboard chỉ hiển thị mã code, không phải link**
- ⚠️ Affiliate Dashboard không còn hiển thị referral link
- ✅ Chỉ hiển thị mã code (ví dụ: `ABC123`)
- ✅ User có thể copy mã code để share

### **2. Referral từ URL param không còn hoạt động**
- ⚠️ Link `/register?ref=ABC123` không còn tự động track
- ✅ User phải nhập mã vào form
- 💡 Có thể giữ backward compatibility: Nếu có `?ref=...` → auto-fill vào input field

### **3. Affiliate Dashboard chỉ cho teacher verified**
- ⚠️ Student truy cập `/dashboard/affiliate` → sẽ bị block
- ✅ Cần redirect hoặc hiển thị message

---

## 💡 NOTES & CONSIDERATIONS

1. **Backward Compatibility:**
   - Có thể giữ logic đọc `?ref=...` từ URL → auto-fill vào input field
   - User vẫn có thể dùng link, nhưng phải submit form

2. **Migration Strategy:**
   - Chạy migration để clean up affiliate_code của student
   - Test kỹ trước khi deploy

3. **User Experience:**
   - Hiển thị rõ ràng referral code là optional
   - Validate real-time khi user nhập
   - Hiển thị thông tin giáo viên giới thiệu nếu mã hợp lệ

4. **Security:**
   - Validate referral code phải từ teacher verified
   - Không cho phép student tạo referral code

---

## 📚 RELATED DOCUMENTS

- `02_Referral_Tracking.md` - Current referral system
- `03_Revenue_Sharing.md` - Revenue sharing logic
- `04_Referral_Dashboard.md` - Dashboard implementation

---

**Document Status:** ✅ READY FOR REVIEW  
**Next Step:** Review và chỉnh sửa trước khi triển khai

