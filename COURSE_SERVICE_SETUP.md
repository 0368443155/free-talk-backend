# Course Service - Setup Instructions

## ✅ Files Created

### Backend Structure
```
talkplatform-backend/src/
├── database/migrations/
│   └── 1764066000000-CreateCoursesAndSessions.ts  ✅
├── features/courses/
│   ├── entities/
│   │   ├── course.entity.ts                       ✅
│   │   └── course-session.entity.ts               ✅
│   ├── dto/
│   │   ├── course.dto.ts                          ✅
│   │   └── session.dto.ts                         ✅
│   ├── courses.controller.ts                      ✅
│   ├── courses.service.ts                         ✅
│   └── courses.module.ts                          ✅
└── common/services/
    └── qr-code.service.ts                         ✅
```

---

## 🔧 Setup Steps

### Step 1: Install Dependencies
```bash
cd talkplatform-backend
npm install qrcode @types/qrcode
```

### Step 2: Update App Module

Open `src/app.module.ts` and add CoursesModule to imports:

```typescript
import { CoursesModule } from './features/courses/courses.module';

@Module({
  imports: [
    // ... existing imports
    CoursesModule,  // Add this line
  ],
  // ...
})
export class AppModule {}
```

### Step 3: Add Environment Variable

Add to `.env`:
```env
FRONTEND_URL=http://localhost:3001
```

### Step 4: Run Migration

```bash
npm run migration:run
```

This will create the `courses` and `course_sessions` tables.

### Step 5: Start Backend

```bash
npm run start:dev
```

---

## 📡 API Endpoints

### Course Management

#### Create Course (Teacher only)
```http
POST /api/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "English Conversation Mastery",
  "description": "Master English conversation through practical sessions",
  "duration_hours": 20,
  "total_sessions": 10,
  "price_type": "per_session",
  "price_per_session": 10.00,
  "language": "English",
  "level": "beginner",
  "category": "Language Learning",
  "max_students": 20
}
```

#### Get All Courses
```http
GET /api/courses?status=upcoming&language=English&page=1&limit=20
```

#### Get My Courses (Teacher)
```http
GET /api/courses/my-courses?status=upcoming
Authorization: Bearer <token>
```

#### Get Course by ID
```http
GET /api/courses/:id
```

#### Update Course (Teacher)
```http
PATCH /api/courses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "price_per_session": 12.00
}
```

#### Delete Course (Teacher)
```http
DELETE /api/courses/:id
Authorization: Bearer <token>
```

#### Regenerate QR Code (Teacher)
```http
POST /api/courses/:id/regenerate-qr
Authorization: Bearer <token>
```

### Session Management

#### Add Session to Course (Teacher)
```http
POST /api/courses/:id/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_number": 1,
  "title": "Introduction to English Conversation",
  "description": "Learn basic greetings and introductions",
  "scheduled_date": "2025-12-01",
  "start_time": "10:00",
  "end_time": "11:30",
  "duration_minutes": 90
}
```

#### Get All Sessions for Course
```http
GET /api/courses/:id/sessions
```

#### Get Session by ID
```http
GET /api/courses/:id/sessions/:sessionId
```

#### Update Session (Teacher)
```http
PATCH /api/courses/:id/sessions/:sessionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Session Title",
  "scheduled_date": "2025-12-02"
}
```

#### Delete Session (Teacher)
```http
DELETE /api/courses/:id/sessions/:sessionId
Authorization: Bearer <token>
```

---

## 🧪 Testing with cURL

### Create a Course
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "English Conversation",
    "duration_hours": 20,
    "total_sessions": 10,
    "price_type": "per_session",
    "price_per_session": 10.00,
    "language": "English",
    "level": "beginner"
  }'
```

### Get All Courses
```bash
curl http://localhost:3000/api/courses
```

### Add Session
```bash
curl -X POST http://localhost:3000/api/courses/COURSE_ID/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_number": 1,
    "title": "Introduction",
    "scheduled_date": "2025-12-01",
    "start_time": "10:00",
    "end_time": "11:30",
    "duration_minutes": 90
  }'
```

---

## ✨ Features Implemented

### Course Features
- ✅ Create course with pricing (per session or full course)
- ✅ Update course details
- ✅ Delete course (only if no students enrolled)
- ✅ Get all courses with filters (status, language, level, category)
- ✅ Get teacher's courses
- ✅ Auto-generate affiliate code
- ✅ Generate QR code and share link
- ✅ Regenerate QR code

### Session Features
- ✅ Add sessions to course
- ✅ Update session details
- ✅ Delete session
- ✅ Get all sessions for a course
- ✅ Auto-generate LiveKit room name
- ✅ Validate session number uniqueness
- ✅ Validate time ranges

### Validation
- ✅ Only verified teachers can create courses
- ✅ Price must be at least $1.00
- ✅ Teachers can only modify their own courses
- ✅ Cannot delete course with enrolled students
- ✅ Session numbers must be unique within course
- ✅ End time must be after start time

### QR Code
- ✅ Auto-generate QR code on course creation
- ✅ QR code contains share link
- ✅ Can regenerate QR code anytime
- ✅ QR code stored as data URL (base64)

---

## 🔍 Database Schema

### courses table
```sql
- id (uuid, PK)
- teacher_id (uuid, FK -> users)
- title (varchar)
- description (text)
- duration_hours (integer)
- total_sessions (integer)
- price_type (varchar: per_session | full_course)
- price_per_session (decimal)
- price_full_course (decimal)
- language (varchar)
- level (varchar: beginner | intermediate | advanced)
- category (varchar)
- status (varchar: upcoming | ongoing | completed | cancelled)
- max_students (integer, default 20)
- current_students (integer, default 0)
- affiliate_code (varchar, unique)
- qr_code_url (text)
- share_link (text)
- created_at (timestamp)
- updated_at (timestamp)
```

### course_sessions table
```sql
- id (uuid, PK)
- course_id (uuid, FK -> courses)
- session_number (integer)
- title (varchar)
- description (text)
- scheduled_date (date)
- start_time (time)
- end_time (time)
- duration_minutes (integer)
- status (varchar: scheduled | in_progress | completed | cancelled)
- livekit_room_name (varchar)
- actual_start_time (timestamp)
- actual_end_time (timestamp)
- actual_duration_minutes (integer)
- created_at (timestamp)
- updated_at (timestamp)

UNIQUE(course_id, session_number)
```

---

## 🚀 Next Steps

After completing this setup:

1. **Test the APIs** using Postman or cURL
2. **Implement Frontend** components:
   - Course creation form
   - Course list/browse
   - Session scheduler
   - QR code display
3. **Implement Enrollment System** (Phase 2):
   - Student purchase flow
   - Payment hold system
   - Attendance tracking
4. **Add Notifications**:
   - Email notifications
   - Push notifications
   - Socket events

---

## 📝 Notes

- QR codes are stored as base64 data URLs in the database
- LiveKit room names follow format: `course_{courseId}_session_{sessionNumber}`
- Affiliate codes are auto-generated: `COURSE_{timestamp}{random}`
- Share links point to: `{FRONTEND_URL}/courses/{courseId}`

---

## 🐛 Troubleshooting

### Migration fails
```bash
# Check if uuid extension is enabled
psql -U postgres -d talkplatform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### QR code generation fails
- Check if `qrcode` package is installed
- Check FRONTEND_URL in .env
- QR code generation is non-blocking, course will still be created

### Cannot create course
- Ensure user has `role: 'teacher'`
- Ensure user has `is_verified: true`
- Check JWT token is valid

---

**Course Service is ready to use!** 🎉
