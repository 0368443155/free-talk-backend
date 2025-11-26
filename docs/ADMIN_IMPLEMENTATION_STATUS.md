# ✅ Admin Role Implementation - Status & Next Steps

**Last Updated**: 2025-11-26

---

## 📊 Current Status

### ✅ Completed

1. **Documentation Updated**:
   - ✅ `docs/PHASE1_COURSE_MANAGEMENT.md` - Updated authorization to "Teacher or Admin"
   - ✅ `docs/ADMIN_ROLE_GUIDE.md` - Complete admin permissions guide created

2. **Controller Updated**:
   - ✅ `courses.controller.ts` - All `@Roles` decorators updated to include 'admin'
   - ✅ All 10 endpoints now allow both 'teacher' and 'admin' roles:
     - `POST /api/courses` - Create course
     - `GET /api/courses/my-courses` - Get my courses
     - `PATCH /api/courses/:id` - Update course
     - `DELETE /api/courses/:id` - Delete course
     - `POST /api/courses/:id/regenerate-qr` - Regenerate QR
     - `PATCH /api/courses/:id/publish` - Publish course
     - `PATCH /api/courses/:id/unpublish` - Unpublish course
     - `POST /api/courses/:id/sessions` - Add session
     - `PATCH /api/courses/:id/sessions/:sid` - Update session
     - `DELETE /api/courses/:id/sessions/:sid` - Delete session

---

## ⚠️ Remaining Issues

### Issue 1: Service Layer Ownership Checks

**Problem**: Service methods still check ownership like this:

```typescript
if (course.teacher_id !== teacherId) {
  throw new ForbiddenException('You can only update your own courses');
}
```

**Impact**: Admin will be blocked even though controller allows them.

**Locations** (8 places in `courses.service.ts`):
- Line 200: `updateCourse()`
- Line 223: `deleteCourse()`
- Line 243: `regenerateQrCode()`
- Line 363: `updateSession()`
- Line 398: `deleteSession()`
- Line 421: `publishCourse()`
- Line 473: `unpublishCourse()`
- Line 501: `addSession()`

---

## 🔧 Solution Options

### Option 1: Pass User Object (Recommended)

**Change service method signatures** to accept full `User` object instead of just `teacherId`:

**Before**:
```typescript
async updateCourse(courseId: string, teacherId: string, dto: UpdateCourseDto) {
  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  
  if (course.teacher_id !== teacherId) {
    throw new ForbiddenException('You can only update your own courses');
  }
  
  // Update logic
}
```

**After**:
```typescript
async updateCourse(courseId: string, user: User, dto: UpdateCourseDto) {
  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  
  // Check ownership or admin
  const isOwner = course.teacher_id === user.id;
  const isAdmin = user.role === 'admin';
  
  if (!isOwner && !isAdmin) {
    throw new ForbiddenException('You can only update your own courses');
  }
  
  // Update logic
}
```

**Controller Changes**:
```typescript
// Before
async updateCourse(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateCourseDto) {
  const teacherId = req.user.id;
  return this.coursesService.updateCourse(id, teacherId, dto);
}

// After
async updateCourse(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateCourseDto) {
  const user = req.user; // Full user object
  return this.coursesService.updateCourse(id, user, dto);
}
```

---

### Option 2: Add isAdmin Flag (Simpler)

**Add an `isAdmin` parameter** to service methods:

```typescript
async updateCourse(courseId: string, teacherId: string, dto: UpdateCourseDto, isAdmin: boolean = false) {
  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  
  // Admin can bypass ownership check
  if (!isAdmin && course.teacher_id !== teacherId) {
    throw new ForbiddenException('You can only update your own courses');
  }
  
  // Update logic
}
```

**Controller**:
```typescript
async updateCourse(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateCourseDto) {
  const teacherId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  return this.coursesService.updateCourse(id, teacherId, dto, isAdmin);
}
```

---

## 📝 Implementation Checklist

### Step 1: Update Service Methods

For each of the 8 methods in `courses.service.ts`:

- [ ] `updateCourse()` - Line 200
- [ ] `deleteCourse()` - Line 223
- [ ] `regenerateQrCode()` - Line 243
- [ ] `addSession()` - Line 501
- [ ] `updateSession()` - Line 363
- [ ] `deleteSession()` - Line 398
- [ ] `publishCourse()` - Line 421
- [ ] `unpublishCourse()` - Line 473

**Change from**:
```typescript
if (course.teacher_id !== teacherId) {
  throw new ForbiddenException('...');
}
```

**To** (Option 1 - User object):
```typescript
const isOwner = course.teacher_id === user.id;
const isAdmin = user.role === 'admin';

if (!isOwner && !isAdmin) {
  throw new ForbiddenException('...');
}
```

**Or** (Option 2 - isAdmin flag):
```typescript
if (!isAdmin && course.teacher_id !== teacherId) {
  throw new ForbiddenException('...');
}
```

---

### Step 2: Update Controller Calls

For each controller method, change:

**From**:
```typescript
const teacherId = req.user.id;
return this.coursesService.methodName(id, teacherId, dto);
```

**To** (Option 1):
```typescript
const user = req.user;
return this.coursesService.methodName(id, user, dto);
```

**Or** (Option 2):
```typescript
const teacherId = req.user.id;
const isAdmin = req.user.role === 'admin';
return this.coursesService.methodName(id, teacherId, dto, isAdmin);
```

---

### Step 3: Update Method Signatures

**Option 1 - User object**:
```typescript
// courses.service.ts
async updateCourse(courseId: string, user: User, dto: UpdateCourseDto): Promise<Course>
async deleteCourse(courseId: string, user: User): Promise<void>
async regenerateQrCode(courseId: string, user: User): Promise<Course>
async addSession(courseId: string, user: User, dto: CreateSessionDto): Promise<CourseSession>
async updateSession(sessionId: string, user: User, dto: UpdateSessionDto): Promise<CourseSession>
async deleteSession(sessionId: string, user: User): Promise<void>
async publishCourse(courseId: string, user: User): Promise<Course>
async unpublishCourse(courseId: string, user: User): Promise<Course>
```

**Option 2 - isAdmin flag**:
```typescript
// courses.service.ts
async updateCourse(courseId: string, teacherId: string, dto: UpdateCourseDto, isAdmin?: boolean): Promise<Course>
async deleteCourse(courseId: string, teacherId: string, isAdmin?: boolean): Promise<void>
// ... etc
```

---

## 🧪 Testing

After implementation, test with admin user:

```bash
# 1. Login as admin
POST http://localhost:3000/api/auth/login
Body: { "email": "admin@example.com", "password": "..." }

# 2. Create course as admin
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {admin_token}
Body: {
  "title": "Admin Test Course",
  "description": "Created by admin",
  "price_full_course": 100
}

# Expected: 201 Created ✅

# 3. Update another teacher's course as admin
PATCH http://localhost:3000/api/courses/{teacher_course_id}
Headers: Authorization: Bearer {admin_token}
Body: { "title": "Updated by Admin" }

# Expected: 200 OK ✅ (Admin can edit any course)

# 4. Delete another teacher's course as admin
DELETE http://localhost:3000/api/courses/{teacher_course_id}
Headers: Authorization: Bearer {admin_token}

# Expected: 204 No Content ✅ (Admin can delete any course)
```

---

## 🎯 Recommendation

**Use Option 1 (User object)** because:
- ✅ More flexible for future features
- ✅ Can access more user info if needed
- ✅ Cleaner code (no extra boolean parameters)
- ✅ Easier to add more role-based logic later

---

## 📚 Summary

### What's Done:
✅ Controller allows admin role  
✅ Documentation updated  
✅ Admin guide created

### What's Needed:
⏳ Update service layer ownership checks (8 methods)  
⏳ Update controller to pass user object  
⏳ Test admin functionality

### Estimated Time:
**30-45 minutes** to update all 8 service methods + controller calls

---

**Next Action**: Choose Option 1 or Option 2 and update the service layer!
