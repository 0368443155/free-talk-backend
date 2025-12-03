# 🐛 BUG FIXES: Course Access & Meeting Room Issues

**Ngày phát hiện**: 2025-12-03  
**Mức độ**: 🔥 High Priority  
**Trạng thái**: 🔧 In Progress

---

## 📋 TÓM TẮT CÁC VẤN ĐỀ

### 1. ❌ Nút "Go to Course" dẫn đến 404
**Mức độ**: 🔥 Critical  
**File**: `talkplatform-frontend/app/courses/[id]/page.tsx` (line 557)

**Vấn đề**:
- Button redirect đến `/courses/${courseId}/learn`
- Không có route `app/courses/[id]/learn/page.tsx` → 404

**Giải pháp**:
- **Option 1** (Khuyến nghị): Tạo route mới `app/courses/[id]/learn/page.tsx`
- **Option 2**: Đổi redirect sang route hiện có `/courses/${courseId}`

---

### 2. ❌ Teacher phải mua khóa học của chính mình
**Mức độ**: 🔥 Critical  
**Files**: 
- Backend: `enrollment.service.ts` (line 323-352)
- Frontend: `courses/[id]/page.tsx` (line 104-138)

**Vấn đề**:
- Backend: `hasAccessToLesson()` có check teacher (line 380) ✅
- Backend: `hasAccessToSession()` **THIẾU** check teacher (line 323-352) ❌
- Frontend: `checkEnrollment()` không check nếu user là teacher ❌

**Giải pháp**:
1. Thêm check `course.teacher_id === userId` vào `hasAccessToSession()` trong backend
2. Thêm check `course.teacher_id === user.id` vào `checkEnrollment()` trong frontend

---

### 3. ⚠️ Meeting room có thể không được tạo
**Mức độ**: ⚠️ Medium  
**File**: `create-course-with-sessions.handler.ts` (line 159-222)

**Phân tích**:
- Code **CÓ** tạo Meeting (line 159-183) ✅
- Code **CÓ** update meeting với lesson_id (line 220-222) ✅
- Code **CÓ** set livekit_room_name vào lesson (line 210) ✅

**Cần verify**:
- [ ] Meeting có được tạo thành công trong database không?
- [ ] lesson_id có được link đúng không?
- [ ] livekit_room_name có được set vào lesson không?

**Hành động**:
- Kiểm tra database: `meetings` table
- Kiểm tra database: `lessons` table (columns: meeting_id, livekit_room_name)
- Xem logs khi tạo course

---

## 🔧 CHI TIẾT SỬA CHỮA

### Fix #1: Tạo Route /learn

#### Option 1: Tạo Page Mới (Khuyến nghị)

**File mới**: `talkplatform-frontend/app/courses/[id]/learn/page.tsx`

```typescript
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCourseByIdApi, Course } from '@/api/courses.rest';
import { useUser } from '@/store/user-store';
import { Loader2 } from 'lucide-react';

export default function CourseLearnPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;
    const { userInfo: user } = useUser();
    
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCourse = async () => {
            try {
                const data = await getCourseByIdApi(courseId);
                setCourse(data);
            } catch (error) {
                console.error('Failed to load course:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCourse();
    }, [courseId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">{course?.title}</h1>
                
                {/* Course Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-xl font-semibold mb-4">Course Content</h2>
                            {/* Sessions and Lessons */}
                            {course?.sessions?.map((session) => (
                                <div key={session.id} className="mb-4">
                                    <h3 className="font-medium">{session.title}</h3>
                                    {/* Lessons list */}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                            <h3 className="font-semibold mb-4">Your Progress</h3>
                            {/* Progress info */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

#### Option 2: Sửa Redirect (Quick Fix)

**File**: `talkplatform-frontend/app/courses/[id]/page.tsx`

**Line 557** - Thay đổi từ:
```typescript
<Button className="w-full h-12 text-lg font-bold" onClick={() => router.push(`/courses/${courseId}/learn`)}>
    Go to Course
</Button>
```

Thành:
```typescript
<Button className="w-full h-12 text-lg font-bold" onClick={() => router.push(`/courses/${courseId}`)}>
    View Course Details
</Button>
```

---

### Fix #2: Teacher Auto-Access

#### Backend Fix

**File**: `talkplatform-backend/src/features/courses/enrollment.service.ts`

**Line 323-352** - Thêm check teacher vào `hasAccessToSession()`:

```typescript
/**
 * Check if user has access to session
 */
async hasAccessToSession(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['course'],
    });

    if (!session) return false;

    // ✅ ADD: Check if user is the teacher
    if (session.course.teacher_id === userId) {
        return true;
    }

    // Check if enrolled in full course
    const enrollment = await this.enrollmentRepository.findOne({
        where: {
            user_id: userId,
            course_id: session.course_id,
            status: EnrollmentStatus.ACTIVE,
        },
    });

    if (enrollment) return true;

    // Check if purchased this session
    const purchase = await this.sessionPurchaseRepository.findOne({
        where: {
            user_id: userId,
            session_id: sessionId,
            status: PurchaseStatus.ACTIVE,
        },
    });

    return !!purchase;
}
```

#### Frontend Fix

**File**: `talkplatform-frontend/app/courses/[id]/page.tsx`

**Line 104-138** - Thêm check teacher vào `checkEnrollment()`:

```typescript
const checkEnrollment = async () => {
    if (!user?.id) {
        setIsEnrolled(false);
        setHasPurchased(false);
        return;
    }

    // ✅ ADD: Check if user is the teacher
    if (course && course.teacher_id === user.id) {
        setIsEnrolled(true);
        setHasPurchased(true);
        return;
    }

    try {
        const enrollments = await getMyEnrollmentsApi();
        const enrollment = enrollments.find(
            (e) => e.course_id === courseId && e.status === 'active' && e.enrollment_type === 'full_course'
        );
        setIsEnrolled(!!enrollment);

        // Also check if user has purchased any session
        if (!enrollment) {
            try {
                const { getMySessionPurchasesApi } = await import('@/api/enrollments.rest');
                const purchases = await getMySessionPurchasesApi();
                const hasSessionPurchase = purchases.some(
                    (p) => p.course_id === courseId && p.status === 'active'
                );
                setHasPurchased(hasSessionPurchase);
            } catch {
                setHasPurchased(false);
            }
        } else {
            setHasPurchased(true);
        }
    } catch (error) {
        console.error('Failed to check enrollment:', error);
        setIsEnrolled(false);
        setHasPurchased(false);
    }
};
```

**Lưu ý**: Cần đảm bảo `course` đã được load trước khi gọi `checkEnrollment()`. Có thể cần điều chỉnh `useEffect`:

```typescript
useEffect(() => {
    const init = async () => {
        await loadCourse(); // Load course first
        await checkEnrollment(); // Then check enrollment
        await loadReviews();
    };
    init();
}, [courseId, user?.id]);
```

---

### Fix #3: Verify Meeting Creation

#### Database Queries để Kiểm Tra

```sql
-- 1. Kiểm tra meetings có được tạo không
SELECT 
    m.id,
    m.title,
    m.lesson_id,
    m.course_id,
    m.session_id,
    m.status,
    m.scheduled_at
FROM meetings m
WHERE m.course_id = 'YOUR_COURSE_ID'
ORDER BY m.scheduled_at;

-- 2. Kiểm tra lessons có meeting_id và livekit_room_name không
SELECT 
    l.id,
    l.title,
    l.meeting_id,
    l.livekit_room_name,
    l.meeting_link,
    l.status
FROM lessons l
JOIN course_sessions cs ON l.session_id = cs.id
WHERE cs.course_id = 'YOUR_COURSE_ID'
ORDER BY l.lesson_number;

-- 3. Kiểm tra relationship giữa meeting và lesson
SELECT 
    m.id as meeting_id,
    m.title as meeting_title,
    m.lesson_id,
    l.id as lesson_id_from_lesson,
    l.title as lesson_title,
    l.meeting_id as meeting_id_from_lesson
FROM meetings m
LEFT JOIN lessons l ON m.lesson_id = l.id
WHERE m.course_id = 'YOUR_COURSE_ID';
```

#### Logging để Debug

Thêm logs vào `create-course-with-sessions.handler.ts`:

```typescript
// After line 183 (after saving meeting)
this.logger.log(`Meeting created: ${savedMeeting.id} for lesson ${lessonDto.lesson_number}`);

// After line 217 (after saving lesson)
this.logger.log(`Lesson created: ${savedLesson.id} with meeting_id: ${savedMeeting.id}, room: ${livekitRoomName}`);

// After line 222 (after updating meeting)
this.logger.log(`Meeting ${savedMeeting.id} updated with lesson_id: ${savedLesson.id}`);
```

---

## ✅ TESTING CHECKLIST

### Test Fix #1: Route /learn

- [ ] Tạo file `app/courses/[id]/learn/page.tsx`
- [ ] Navigate đến `/courses/[courseId]/learn`
- [ ] Verify page loads without 404
- [ ] Verify course data hiển thị đúng

### Test Fix #2: Teacher Auto-Access

#### Backend Test
- [ ] Teacher tạo course mới
- [ ] Call API `GET /api/enrollments/sessions/:sessionId/access` với teacher token
- [ ] Verify response: `{ hasAccess: true }`

#### Frontend Test
- [ ] Login as teacher
- [ ] Navigate đến course detail page của course mình tạo
- [ ] Verify "You are enrolled!" message hiển thị
- [ ] Verify "Go to Course" button hiển thị (không phải "Buy Now")
- [ ] Không cần mua course

### Test Fix #3: Meeting Creation

- [ ] Tạo course mới với sessions và lessons
- [ ] Check database: `meetings` table có records
- [ ] Check database: `lessons` table có `meeting_id` và `livekit_room_name`
- [ ] Verify `meeting.lesson_id` match với `lesson.id`
- [ ] Check logs: Không có errors

---

## 📊 IMPACT ANALYSIS

### Fix #1: Route /learn
**Impact**: High  
**Risk**: Low  
**Effort**: 2-3 hours

**Affected Users**: All enrolled students  
**Affected Features**: Course navigation

### Fix #2: Teacher Auto-Access
**Impact**: Critical  
**Risk**: Low  
**Effort**: 1 hour

**Affected Users**: All teachers  
**Affected Features**: Course access, Session access, Lesson access

### Fix #3: Meeting Verification
**Impact**: Medium  
**Risk**: Low  
**Effort**: 30 minutes (verification only)

**Affected Users**: All students and teachers  
**Affected Features**: LiveKit meetings, Lesson scheduling

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: Backend Fixes (Priority)
1. Fix `hasAccessToSession()` in `enrollment.service.ts`
2. Deploy backend
3. Test API endpoints

### Phase 2: Frontend Fixes
1. Fix `checkEnrollment()` in `courses/[id]/page.tsx`
2. Create `/learn` route (if Option 1)
3. Deploy frontend
4. Test UI flows

### Phase 3: Verification
1. Run database queries
2. Check logs
3. Verify meeting creation
4. User acceptance testing

---

## 📝 NOTES

- Fix #2 là **CRITICAL** vì ảnh hưởng đến tất cả teachers
- Fix #1 cần quyết định: Tạo page mới hay sửa redirect?
- Fix #3 có thể chỉ cần verification, code có vẻ đúng

**Last Updated**: 2025-12-03  
**Status**: Ready for Implementation
