# 🔧 Phase 1 Fix: Admin Role & Cleanup

**Version**: 1.1  
**Status**: 🔨 **FIXES REQUIRED**  
**Priority**: High  
**Estimated Time**: 1-2 hours

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Issue 1: Admin Role Ownership Checks](#issue-1-admin-role-ownership-checks)
3. [Issue 2: SessionMaterial Cleanup](#issue-2-sessionmaterial-cleanup)
4. [Issue 3: Enable Publish Validations](#issue-3-enable-publish-validations)
5. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Issues to Fix

1. ⚠️ **Admin Role**: Admin không thể quản lý courses của teachers khác (ownership checks quá strict)
2. ⚠️ **SessionMaterial**: Duplicate với LessonMaterial, cần cleanup
3. ⚠️ **Publish Validations**: Validations quan trọng đang bị comment

### Goals

- ✅ Admin có thể quản lý TẤT CẢ courses (của bất kỳ teacher nào)
- ✅ Teacher chỉ quản lý courses của mình
- ✅ Cleanup duplicate entities
- ✅ Enable validations khi publish course

---

## 🔧 Issue 1: Admin Role Ownership Checks

### Problem

Service layer check ownership như này:
```typescript
if (course.teacher_id !== teacherId) {
  throw new ForbiddenException('You can only update your own courses');
}
```

→ **Admin bị block** khi update courses của teachers khác!

### Solution: Update Service Methods

Thay vì pass `teacherId: string`, pass `user: User` object để check role.

---

### Step 1.1: Update Service Method Signatures

**File**: `src/features/courses/courses.service.ts`

#### Before:
```typescript
async updateCourse(
  courseId: string,
  teacherId: string,
  dto: UpdateCourseDto
): Promise<Course>
```

#### After:
```typescript
async updateCourse(
  courseId: string,
  user: User,
  dto: UpdateCourseDto
): Promise<Course>
```

**Apply to these 8 methods**:
1. `updateCourse(courseId, user, dto)`
2. `deleteCourse(courseId, user)`
3. `addSession(courseId, user, dto)`
4. `updateSession(sessionId, user, dto)`
5. `deleteSession(sessionId, user)`
6. `regenerateQrCode(courseId, user)`
7. `publishCourse(courseId, user)`
8. `unpublishCourse(courseId, user)`

---

### Step 1.2: Update Ownership Checks

**Pattern to apply**:

#### Before:
```typescript
async updateCourse(courseId: string, teacherId: string, dto: UpdateCourseDto): Promise<Course> {
  const course = await this.getCourseById(courseId, teacherId);

  if (course.teacher_id !== teacherId) {
    throw new ForbiddenException('You can only update your own courses');
  }

  // ... rest of logic
}
```

#### After:
```typescript
async updateCourse(courseId: string, user: User, dto: UpdateCourseDto): Promise<Course> {
  const course = await this.getCourseById(courseId, user.id);

  // Check ownership or admin
  const isOwner = course.teacher_id === user.id;
  const isAdmin = user.role === UserRole.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenException('You can only update your own courses');
  }

  // ... rest of logic
}
```

---

### Step 1.3: Detailed Changes for Each Method

#### 1. `updateCourse()` (Line 235-260)

```typescript
async updateCourse(
    courseId: string,
    user: User,
    dto: UpdateCourseDto
): Promise<Course> {
    const course = await this.getCourseById(courseId, user.id);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only update your own courses');
    }

    if (dto.price_type) {
        if (dto.price_type === PriceType.PER_SESSION && dto.price_per_session && dto.price_per_session < 1) {
            throw new BadRequestException('Price per session must be at least $1.00');
        }
        if (dto.price_type === PriceType.FULL_COURSE && dto.price_full_course && dto.price_full_course < 1) {
            throw new BadRequestException('Full course price must be at least $1.00');
        }
    }

    await this.courseRepository.update(courseId, dto);

    this.logger.log(`✏️ Course updated: ${courseId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);

    return this.getCourseById(courseId, user.id);
}
```

---

#### 2. `deleteCourse()` (Line 262-276)

```typescript
async deleteCourse(courseId: string, user: User): Promise<void> {
    const course = await this.getCourseById(courseId, user.id);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only delete your own courses');
    }

    if (course.current_students > 0) {
        throw new BadRequestException('Cannot delete course with enrolled students');
    }

    await this.courseRepository.delete(courseId);

    this.logger.log(`🗑️ Course deleted: ${courseId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);
}
```

---

#### 3. `addSession()` (Line 278-329)

```typescript
async addSession(
    courseId: string,
    user: User,
    dto: CreateSessionDto
): Promise<CourseSession> {
    const course = await this.getCourseById(courseId, user.id);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only add sessions to your own courses');
    }

    const existingSession = await this.sessionRepository.findOne({
        where: {
            course_id: courseId,
            session_number: dto.session_number
        }
    });

    if (existingSession) {
        throw new BadRequestException(`Session number ${dto.session_number} already exists`);
    }

    // Validate date is in future
    const sessionDate = new Date(dto.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (sessionDate < today) {
        throw new BadRequestException('Session date must be in the future');
    }

    // Create session (group of lessons)
    const session = this.sessionRepository.create({
        course_id: courseId,
        session_number: dto.session_number,
        title: dto.title,
        description: dto.description,
        total_lessons: 0,
        status: SessionStatus.DRAFT,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Update course total_sessions
    await this.courseRepository.update(courseId, {
        total_sessions: () => 'total_sessions + 1'
    });

    this.logger.log(`✅ Session added to course ${courseId}: Session #${dto.session_number} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);

    return Array.isArray(savedSession) ? savedSession[0] : savedSession;
}
```

---

#### 4. `updateSession()` (Line 365-386)

```typescript
async updateSession(
    sessionId: string,
    user: User,
    dto: UpdateSessionDto
): Promise<CourseSession> {
    const session = await this.getSessionById(sessionId);

    // Check ownership or admin
    const isOwner = session.course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only update sessions of your own courses');
    }

    const updateData: any = { ...dto };

    await this.sessionRepository.update(sessionId, updateData);

    this.logger.log(`✏️ Session updated: ${sessionId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);

    return this.getSessionById(sessionId);
}
```

---

#### 5. `deleteSession()` (Line 388-409)

```typescript
async deleteSession(sessionId: string, user: User): Promise<void> {
    const session = await this.getSessionById(sessionId);

    // Check ownership or admin
    const isOwner = session.course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only delete sessions of your own courses');
    }

    const courseId = session.course_id;

    await this.sessionRepository.delete(sessionId);

    // Update course total_sessions
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (course) {
        const newTotalSessions = Math.max(0, course.total_sessions - 1);
        await this.courseRepository.update(courseId, {
            total_sessions: newTotalSessions
        });
    }

    this.logger.log(`🗑️ Session deleted: ${sessionId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);
}
```

---

#### 6. `regenerateQrCode()` (Line 411-439)

```typescript
async regenerateQrCode(courseId: string, user: User): Promise<Course> {
    const course = await this.getCourseById(courseId);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only regenerate QR code for your own courses');
    }

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
    const shareLink = `${frontendUrl}/courses/${courseId}`;

    try {
        const qrCodeDataUrl = await this.qrCodeService.generateDataUrl(shareLink);

        await this.courseRepository.update(courseId, {
            share_link: shareLink,
            qr_code_url: qrCodeDataUrl,
        });

        course.share_link = shareLink;
        course.qr_code_url = qrCodeDataUrl;

        this.logger.log(`🔄 QR code regenerated for course: ${courseId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);
    } catch (error) {
        this.logger.error(`Failed to regenerate QR code: ${error.message}`);
        throw new BadRequestException('Failed to regenerate QR code');
    }

    return course;
}
```

---

#### 7. `publishCourse()` (Line 463-490)

```typescript
async publishCourse(courseId: string, user: User): Promise<Course> {
    const course = await this.getCourseById(courseId, user.id);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only publish your own courses');
    }

    // ✅ RE-ENABLE VALIDATIONS (see Issue 3)
    // Check has at least 1 session
    if (course.total_sessions === 0 || !course.sessions || course.sessions.length === 0) {
        throw new BadRequestException('Course must have at least one session to be published');
    }

    // Check pricing is set
    if (!course.price_full_course && !course.price_per_session) {
        throw new BadRequestException('Course must have pricing set (full course or per session)');
    }

    // Update course status
    course.status = CourseStatus.PUBLISHED;
    course.is_published = true;

    const updated = await this.courseRepository.save(course);

    this.logger.log(`📢 Course published: ${courseId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);

    return updated;
}
```

---

#### 8. `unpublishCourse()` (Line 492-511)

```typescript
async unpublishCourse(courseId: string, user: User): Promise<Course> {
    const course = await this.getCourseById(courseId, user.id);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only unpublish your own courses');
    }

    // Update course status
    course.is_published = false;
    if (course.status === CourseStatus.PUBLISHED) {
        course.status = CourseStatus.DRAFT;
    }

    const updated = await this.courseRepository.save(course);

    this.logger.log(`🔒 Course unpublished: ${courseId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);

    return updated;
}
```

---

### Step 1.4: Update Controller Calls

**File**: `src/features/courses/courses.controller.ts`

#### Pattern:

**Before**:
```typescript
async updateCourse(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateCourseDto) {
    const teacherId = req.user.id;
    return this.coursesService.updateCourse(id, teacherId, dto);
}
```

**After**:
```typescript
async updateCourse(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateCourseDto) {
    const user = req.user; // Full user object
    return this.coursesService.updateCourse(id, user, dto);
}
```

---

#### Apply to these endpoints:

1. **`updateCourse()`** (Line 103-110):
```typescript
async updateCourse(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateCourseDto,
) {
    const user = req.user;
    return this.coursesService.updateCourse(id, user, dto);
}
```

2. **`deleteCourse()`** (Line 122-125):
```typescript
async deleteCourse(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    await this.coursesService.deleteCourse(id, user);
}
```

3. **`regenerateQrCode()`** (Line 134-137):
```typescript
async regenerateQrCode(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.coursesService.regenerateQrCode(id, user);
}
```

4. **`publishCourse()`** (Line 148-151):
```typescript
async publishCourse(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.coursesService.publishCourse(id, user);
}
```

5. **`unpublishCourse()`** (Line 161-164):
```typescript
async unpublishCourse(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    return this.coursesService.unpublishCourse(id, user);
}
```

6. **`addSession()`** (Line 176-183):
```typescript
async addSession(
    @Param('id') courseId: string,
    @Req() req: any,
    @Body() dto: CreateSessionDto,
) {
    const user = req.user;
    return this.coursesService.addSession(courseId, user, dto);
}
```

7. **`updateSession()`** (Line 209-216):
```typescript
async updateSession(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() dto: UpdateSessionDto,
) {
    const user = req.user;
    return this.coursesService.updateSession(sessionId, user, dto);
}
```

8. **`deleteSession()`** (Line 227-230):
```typescript
async deleteSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    const user = req.user;
    await this.coursesService.deleteSession(sessionId, user);
}
```

---

### Step 1.5: Update Lesson Methods (Bonus)

Same pattern for lesson methods:

1. **`addLesson()`** (Line 258-265):
```typescript
async addLesson(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() dto: CreateLessonDto,
) {
    const user = req.user;
    return this.coursesService.addLesson(sessionId, user, dto);
}
```

2. **`updateLesson()`** (Line 275-282):
```typescript
async updateLesson(
    @Param('lessonId') lessonId: string,
    @Req() req: any,
    @Body() dto: UpdateLessonDto,
) {
    const user = req.user;
    return this.coursesService.updateLesson(lessonId, user, dto);
}
```

3. **`deleteLesson()`** (Line 293-296):
```typescript
async deleteLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    const user = req.user;
    await this.coursesService.deleteLesson(lessonId, user);
}
```

And update service methods accordingly (same pattern as above).

---

## 🧹 Issue 2: SessionMaterial Cleanup

### Problem

Có 2 entities tương tự nhau:
- `SessionMaterial` - Materials cho Session (nhóm)
- `LessonMaterial` - Materials cho Lesson (buổi học)

Theo kiến trúc mới, **Session chỉ là container/nhóm**, không phải buổi học. Materials nên gắn với **Lesson** (buổi học thực tế).

### Solution Options

#### Option A: Remove SessionMaterial Completely

**Pros**: 
- Đơn giản, không duplicate
- Materials gắn với lesson (buổi học thực tế)

**Cons**:
- Mất khả năng có materials chung cho cả session

#### Option B: Keep Both (Recommended)

**Use cases**:
- `SessionMaterial`: Materials **chung** cho cả session/tuần (ví dụ: syllabus, overview)
- `LessonMaterial`: Materials **cụ thể** cho từng lesson (ví dụ: homework, slides)

**Implementation**: Giữ nguyên cả 2, nhưng clarify usage trong documentation.

---

### Step 2.1: Update Documentation

**File**: `docs/PHASE1_ENHANCED_MATERIALS.md`

Add clarification:

```markdown
## Material Types

### 1. Session Materials (Optional)
- **Purpose**: Materials chung cho cả session/tuần
- **Examples**: 
  - Week overview PDF
  - Syllabus for the module
  - General resources
- **Entity**: `SessionMaterial`

### 2. Lesson Materials (Primary)
- **Purpose**: Materials cụ thể cho từng buổi học
- **Examples**:
  - Lesson slides
  - Homework assignments
  - Practice exercises
- **Entity**: `LessonMaterial`

### Best Practices
- Use **Session Materials** for overview/general content
- Use **Lesson Materials** for specific lesson content
- Most materials should be **Lesson Materials**
```

---

### Step 2.2: Add Session Materials to API (Optional)

If keeping SessionMaterial, add endpoints:

**File**: `src/features/courses/courses.controller.ts`

```typescript
// Add session materials
@Post(':id/sessions/:sessionId/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: 'Add material to session (Teacher or Admin)' })
async addSessionMaterial(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() dto: CreateSessionMaterialDto,
) {
    const user = req.user;
    return this.coursesService.addSessionMaterial(sessionId, user, dto);
}

// Get session materials
@Get(':id/sessions/:sessionId/materials')
@ApiOperation({ summary: 'Get all materials for a session' })
async getSessionMaterials(@Param('sessionId') sessionId: string) {
    return this.coursesService.getSessionMaterials(sessionId);
}
```

---

## ✅ Issue 3: Enable Publish Validations

### Problem

Validations trong `publishCourse()` đang bị comment:

```typescript
// TODO: Re-enable these validations after testing
// Check has at least 1 session
// if (course.total_sessions === 0 || !course.sessions || course.sessions.length === 0) {
//     throw new BadRequestException('Course must have at least one session to be published');
// }

// Check pricing is set
// if (!course.price_full_course && !course.price_per_session) {
//     throw new BadRequestException('Course must have pricing set (full course or per session)');
// }
```

### Solution

**File**: `src/features/courses/courses.service.ts` (Line 470-479)

**Uncomment và enable**:

```typescript
async publishCourse(courseId: string, user: User): Promise<Course> {
    const course = await this.getCourseById(courseId, user.id);

    // Check ownership or admin
    const isOwner = course.teacher_id === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
        throw new ForbiddenException('You can only publish your own courses');
    }

    // ✅ ENABLE VALIDATIONS
    // Check has at least 1 session
    if (course.total_sessions === 0 || !course.sessions || course.sessions.length === 0) {
        throw new BadRequestException('Course must have at least one session to be published');
    }

    // Check pricing is set
    if (!course.price_full_course && !course.price_per_session) {
        throw new BadRequestException('Course must have pricing set (full course or per session)');
    }

    // Update course status
    course.status = CourseStatus.PUBLISHED;
    course.is_published = true;

    const updated = await this.courseRepository.save(course);

    this.logger.log(`📢 Course published: ${courseId} by ${isAdmin ? 'admin' : 'owner'} ${user.username}`);

    return updated;
}
```

---

## 🧪 Testing Guide

### Test 1: Admin Can Manage All Courses

```bash
# 1. Login as teacher
POST http://localhost:3000/api/auth/login
Body: { "email": "teacher@example.com", "password": "..." }
# Save teacher_token

# 2. Teacher creates course
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {teacher_token}
Body: {
  "title": "Teacher's Course",
  "description": "Test course",
  "price_type": "per_session",
  "price_per_session": 10,
  "duration_hours": 20
}
# Save course_id

# 3. Login as admin
POST http://localhost:3000/api/auth/login
Body: { "email": "admin@example.com", "password": "..." }
# Save admin_token

# 4. Admin updates teacher's course (should work ✅)
PATCH http://localhost:3000/api/courses/{course_id}
Headers: Authorization: Bearer {admin_token}
Body: {
  "title": "Updated by Admin"
}
# Expected: 200 OK ✅

# 5. Admin deletes teacher's course (should work ✅)
DELETE http://localhost:3000/api/courses/{course_id}
Headers: Authorization: Bearer {admin_token}
# Expected: 204 No Content ✅
```

---

### Test 2: Teacher Can Only Manage Own Courses

```bash
# 1. Login as teacher1
POST http://localhost:3000/api/auth/login
Body: { "email": "teacher1@example.com", "password": "..." }
# Save teacher1_token

# 2. Teacher1 creates course
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {teacher1_token}
Body: { "title": "Teacher1's Course", ... }
# Save course_id

# 3. Login as teacher2
POST http://localhost:3000/api/auth/login
Body: { "email": "teacher2@example.com", "password": "..." }
# Save teacher2_token

# 4. Teacher2 tries to update teacher1's course (should fail ❌)
PATCH http://localhost:3000/api/courses/{course_id}
Headers: Authorization: Bearer {teacher2_token}
Body: { "title": "Hacked!" }
# Expected: 403 Forbidden ❌
```

---

### Test 3: Publish Validations

```bash
# 1. Create course without sessions
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {teacher_token}
Body: {
  "title": "Empty Course",
  "price_type": "per_session",
  "price_per_session": 10,
  "duration_hours": 20
}
# Save course_id

# 2. Try to publish (should fail ❌)
PATCH http://localhost:3000/api/courses/{course_id}/publish
Headers: Authorization: Bearer {teacher_token}
# Expected: 400 Bad Request
# Message: "Course must have at least one session to be published"

# 3. Add session
POST http://localhost:3000/api/courses/{course_id}/sessions
Headers: Authorization: Bearer {teacher_token}
Body: {
  "session_number": 1,
  "title": "Week 1",
  "scheduled_date": "2025-12-01"
}

# 4. Try to publish again (should work ✅)
PATCH http://localhost:3000/api/courses/{course_id}/publish
Headers: Authorization: Bearer {teacher_token}
# Expected: 200 OK ✅
```

---

## 📋 Implementation Checklist

### Issue 1: Admin Role
- [ ] Update `updateCourse()` signature and logic
- [ ] Update `deleteCourse()` signature and logic
- [ ] Update `addSession()` signature and logic
- [ ] Update `updateSession()` signature and logic
- [ ] Update `deleteSession()` signature and logic
- [ ] Update `regenerateQrCode()` signature and logic
- [ ] Update `publishCourse()` signature and logic
- [ ] Update `unpublishCourse()` signature and logic
- [ ] Update all controller methods to pass `req.user`
- [ ] Update lesson methods (bonus)
- [ ] Test admin can manage all courses
- [ ] Test teacher can only manage own courses

### Issue 2: SessionMaterial
- [ ] Decide: Remove or Keep Both
- [ ] If keep: Update documentation
- [ ] If keep: Add API endpoints (optional)
- [ ] If remove: Create migration to drop table
- [ ] If remove: Remove entity and DTOs

### Issue 3: Publish Validations
- [ ] Uncomment validation in `publishCourse()`
- [ ] Test publish without sessions (should fail)
- [ ] Test publish without pricing (should fail)
- [ ] Test publish with valid data (should work)

---

## 🎯 Summary

### Changes Required

**Files to modify**:
1. `src/features/courses/courses.service.ts` - 8 methods + ownership checks
2. `src/features/courses/courses.controller.ts` - 8 endpoints + pass user object
3. `docs/PHASE1_ENHANCED_MATERIALS.md` - Clarify SessionMaterial usage (optional)

**Time estimate**: 1-2 hours

**Impact**: 
- ✅ Admin có full control
- ✅ Teacher vẫn chỉ quản lý courses của mình
- ✅ Code clean hơn, không duplicate
- ✅ Validations đầy đủ

---

**End of Document**
