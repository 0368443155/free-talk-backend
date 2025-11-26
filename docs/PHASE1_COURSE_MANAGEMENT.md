# 📚 Phase 1: Course Management System

**Version**: 1.0  
**Status**: ✅ **COMPLETE**  
**Priority**: Critical  
**Estimated Time**: 2-3 days

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Entity Definitions](#entity-definitions)
4. [Business Logic Flows](#business-logic-flows)
5. [API Endpoints](#api-endpoints)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Purpose

Allow teachers to create and manage structured courses with multiple sessions. Students can browse and view course details, but enrollment is handled in Phase 2.

### Key Features

- ✅ Teachers and admins can create courses
- ✅ Teachers and admins can add/edit/delete sessions
- ✅ Teachers and admins can publish/unpublish courses
- ✅ Students can browse published courses
- ✅ Students can view course details
- ✅ QR code generation for sessions
- ✅ LiveKit room integration

### User Roles

- **Teacher**: Can create and manage their own courses
- **Student**: Can browse and view courses (read-only)
- **Admin**: Can manage all courses

---

## 🗄️ Database Schema

### Tables Overview

```
courses
├── id (PK)
├── teacher_id (FK → users.id)
├── title
├── description
├── category
├── level
├── language
├── price_full_course
├── price_per_session
├── max_students
├── current_students
├── duration_hours
├── total_sessions
├── status
├── is_published
├── created_at
└── updated_at

course_sessions
├── id (PK)
├── course_id (FK → courses.id)
├── session_number
├── title
├── description
├── scheduled_date
├── start_time
├── end_time
├── duration_minutes
├── meeting_link
├── meeting_id
├── livekit_room_name
├── qr_code_url
├── qr_code_data
├── status
├── created_at
└── updated_at
```

---

## 🔧 Entity Definitions

### 1. Course Entity

**File**: `src/features/courses/entities/course.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { CourseSession } from './course-session.entity';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('courses')
@Index(['teacher_id'])
@Index(['category'])
@Index(['status'])
@Index(['is_published'])
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Teacher who created the course
  @Column({ type: 'varchar', length: 36 })
  teacher_id: string;

  // Basic Information
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    enum: CourseLevel,
  })
  level: CourseLevel;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string;

  // Pricing
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_full_course: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price_per_session: number;

  // Capacity
  @Column({ type: 'int', default: 30 })
  max_students: number;

  @Column({ type: 'int', default: 0 })
  current_students: number;

  // Metadata
  @Column({ type: 'int', nullable: true })
  duration_hours: number;

  @Column({ type: 'int', default: 0 })
  total_sessions: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    default: CourseStatus.DRAFT,
    enum: CourseStatus,
  })
  status: CourseStatus;

  @Column({ type: 'boolean', default: false })
  is_published: boolean;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @OneToMany(() => CourseSession, (session) => session.course, {
    cascade: true,
  })
  sessions: CourseSession[];
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `teacher_id` | UUID | Yes | Teacher who created the course |
| `title` | String(255) | Yes | Course title |
| `description` | Text | No | Detailed course description |
| `category` | String(100) | No | Course category (e.g., "Language", "Programming") |
| `level` | Enum | No | Difficulty level (beginner/intermediate/advanced) |
| `language` | String(50) | No | Teaching language |
| `price_full_course` | Decimal(10,2) | No | Price for full course enrollment |
| `price_per_session` | Decimal(10,2) | No | Price per individual session |
| `max_students` | Integer | Yes | Maximum number of students (default: 30) |
| `current_students` | Integer | Yes | Current enrolled students (default: 0) |
| `duration_hours` | Integer | No | Total course duration in hours |
| `total_sessions` | Integer | Yes | Total number of sessions (default: 0) |
| `status` | Enum | Yes | Course status (draft/published/archived) |
| `is_published` | Boolean | Yes | Whether course is visible to students |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. `teacher_id` must reference an existing user with role 'teacher' or 'admin'
2. `title` must be unique per teacher
3. `price_full_course` should be less than `price_per_session * total_sessions` (discount)
4. `current_students` cannot exceed `max_students`
5. `total_sessions` is auto-calculated from related sessions
6. Course can only be published if `total_sessions > 0` and pricing is set

---

### 2. CourseSession Entity

**File**: `src/features/courses/entities/course-session.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Course } from './course.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('course_sessions')
@Index(['course_id'])
@Index(['scheduled_date'])
@Index(['status'])
export class CourseSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Course reference
  @Column({ type: 'varchar', length: 36 })
  course_id: string;

  // Session Information
  @Column({ type: 'int' })
  session_number: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Schedule
  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'varchar', length: 10 })
  start_time: string; // Format: "HH:MM" (e.g., "14:00")

  @Column({ type: 'varchar', length: 10 })
  end_time: string; // Format: "HH:MM" (e.g., "16:00")

  @Column({ type: 'int' })
  duration_minutes: number;

  // Meeting Information
  @Column({ type: 'varchar', length: 500, nullable: true })
  meeting_link: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  meeting_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  livekit_room_name: string;

  // QR Code
  @Column({ type: 'varchar', length: 500, nullable: true })
  qr_code_url: string;

  @Column({ type: 'text', nullable: true })
  qr_code_data: string; // JSON string with session info

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    default: SessionStatus.SCHEDULED,
    enum: SessionStatus,
  })
  status: SessionStatus;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Course, (course) => course.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key |
| `course_id` | UUID | Yes | Parent course reference |
| `session_number` | Integer | Yes | Sequential session number (1, 2, 3...) |
| `title` | String(255) | Yes | Session title |
| `description` | Text | No | Session description |
| `scheduled_date` | Date | Yes | Date of the session |
| `start_time` | String(10) | Yes | Start time (HH:MM format) |
| `end_time` | String(10) | Yes | End time (HH:MM format) |
| `duration_minutes` | Integer | Yes | Session duration in minutes |
| `meeting_link` | String(500) | No | Full meeting URL |
| `meeting_id` | String(100) | No | Meeting ID for joining |
| `livekit_room_name` | String(255) | No | LiveKit room identifier |
| `qr_code_url` | String(500) | No | URL to QR code image |
| `qr_code_data` | Text | No | QR code data (JSON) |
| `status` | Enum | Yes | Session status |
| `created_at` | Timestamp | Yes | Creation timestamp |
| `updated_at` | Timestamp | Yes | Last update timestamp |

**Business Rules**:

1. `session_number` must be unique within a course
2. `scheduled_date` must be in the future when creating
3. `start_time` must be before `end_time`
4. `duration_minutes` is auto-calculated from start_time and end_time
5. `livekit_room_name` format: `course_{courseId}_session_{sessionNumber}`
6. QR code is auto-generated on session creation

---

## 🔄 Business Logic Flows

### Flow 1: Create Course

**Endpoint**: `POST /api/courses`

**Authorization**: Teacher or Admin

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "English Conversation for Beginners",
  "description": "Learn basic English conversation skills through interactive sessions",
  "category": "Language",
  "level": "beginner",
  "language": "English",
  "price_full_course": 100.00,
  "price_per_session": 12.00,
  "max_students": 30,
  "duration_hours": 20
}
```

**Validation Rules**:
- `title`: Required, 3-255 characters, unique per teacher
- `description`: Optional, max 5000 characters
- `category`: Optional, max 100 characters
- `level`: Optional, must be one of: beginner, intermediate, advanced
- `language`: Optional, max 50 characters
- `price_full_course`: Optional, must be > 0 if provided
- `price_per_session`: Optional, must be > 0 if provided
- `max_students`: Optional, must be between 1 and 100, default 30
- `duration_hours`: Optional, must be > 0

**Process Steps**:

1. **Authenticate User**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
     throw new UnauthorizedException('Only teachers and admins can create courses');
   }
   ```

2. **Validate Input**:
   ```typescript
   const dto = await validateDto(CreateCourseDto, req.body);
   ```

3. **Check Title Uniqueness**:
   ```typescript
   const existing = await courseRepository.findOne({
     where: { teacher_id: user.id, title: dto.title }
   });
   if (existing) {
     throw new BadRequestException('Course with this title already exists');
   }
   ```

4. **Create Course**:
   ```typescript
   const course = courseRepository.create({
     teacher_id: user.id,
     title: dto.title,
     description: dto.description,
     category: dto.category,
     level: dto.level,
     language: dto.language,
     price_full_course: dto.price_full_course,
     price_per_session: dto.price_per_session,
     max_students: dto.max_students || 30,
     duration_hours: dto.duration_hours,
     status: CourseStatus.DRAFT,
     is_published: false,
     current_students: 0,
     total_sessions: 0,
   });
   ```

5. **Save to Database**:
   ```typescript
   const saved = await courseRepository.save(course);
   ```

6. **Return Response**:
   ```typescript
   return {
     id: saved.id,
     title: saved.title,
     status: saved.status,
     created_at: saved.created_at,
   };
   ```

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "teacher_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "English Conversation for Beginners",
  "description": "Learn basic English conversation skills through interactive sessions",
  "category": "Language",
  "level": "beginner",
  "language": "English",
  "price_full_course": 100.00,
  "price_per_session": 12.00,
  "max_students": 30,
  "current_students": 0,
  "duration_hours": 20,
  "total_sessions": 0,
  "status": "draft",
  "is_published": false,
  "created_at": "2025-11-26T10:00:00.000Z",
  "updated_at": "2025-11-26T10:00:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | User is not a teacher or admin |
| 400 | Bad Request | Validation failed or duplicate title |
| 500 | Internal Server Error | Database or server error |

---

### Flow 2: Add Session to Course

**Endpoint**: `POST /api/courses/:courseId/sessions`

**Authorization**: Teacher (course owner) only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Path Parameters**:
- `courseId`: UUID of the course

**Request Body**:
```json
{
  "session_number": 1,
  "title": "Introduction & Basic Greetings",
  "description": "Learn how to introduce yourself and use basic greetings",
  "scheduled_date": "2025-12-01",
  "start_time": "14:00",
  "end_time": "16:00"
}
```

**Validation Rules**:
- `session_number`: Required, must be positive integer, unique within course
- `title`: Required, 3-255 characters
- `description`: Optional, max 5000 characters
- `scheduled_date`: Required, must be in format YYYY-MM-DD, must be future date
- `start_time`: Required, format HH:MM (24-hour)
- `end_time`: Required, format HH:MM (24-hour), must be after start_time

**Process Steps**:

1. **Authenticate & Authorize**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   const course = await courseRepository.findOne({
     where: { id: courseId }
   });
   
   if (!course) {
     throw new NotFoundException('Course not found');
   }
   
   if (course.teacher_id !== user.id) {
     throw new ForbiddenException('You can only add sessions to your own courses');
   }
   ```

2. **Validate Input**:
   ```typescript
   const dto = await validateDto(CreateSessionDto, req.body);
   
   // Validate date is in future
   const sessionDate = new Date(dto.scheduled_date);
   if (sessionDate < new Date()) {
     throw new BadRequestException('Session date must be in the future');
   }
   
   // Validate time format and logic
   if (dto.start_time >= dto.end_time) {
     throw new BadRequestException('End time must be after start time');
   }
   ```

3. **Check Session Number Uniqueness**:
   ```typescript
   const existing = await sessionRepository.findOne({
     where: { course_id: courseId, session_number: dto.session_number }
   });
   
   if (existing) {
     throw new BadRequestException('Session number already exists');
   }
   ```

4. **Calculate Duration**:
   ```typescript
   const duration = calculateDurationMinutes(dto.start_time, dto.end_time);
   // Example: "14:00" to "16:00" = 120 minutes
   ```

5. **Generate LiveKit Room Name**:
   ```typescript
   const livekitRoomName = `course_${courseId}_session_${dto.session_number}`;
   ```

6. **Generate QR Code**:
   ```typescript
   const qrData = {
     course_id: courseId,
     session_id: null, // Will be set after save
     session_number: dto.session_number,
     title: dto.title,
     date: dto.scheduled_date,
     time: dto.start_time,
     room: livekitRoomName,
   };
   
   const qrCodeUrl = await qrCodeService.generateQRCode(qrData);
   // Returns: "/uploads/qr/course_abc_session_1.png"
   ```

7. **Create Session**:
   ```typescript
   const session = sessionRepository.create({
     course_id: courseId,
     session_number: dto.session_number,
     title: dto.title,
     description: dto.description,
     scheduled_date: dto.scheduled_date,
     start_time: dto.start_time,
     end_time: dto.end_time,
     duration_minutes: duration,
     livekit_room_name: livekitRoomName,
     qr_code_url: qrCodeUrl,
     qr_code_data: JSON.stringify(qrData),
     status: SessionStatus.SCHEDULED,
   });
   ```

8. **Save Session**:
   ```typescript
   const saved = await sessionRepository.save(session);
   ```

9. **Update Course Total Sessions**:
   ```typescript
   await courseRepository.update(courseId, {
     total_sessions: () => 'total_sessions + 1'
   });
   ```

10. **Return Response**:
    ```typescript
    return {
      ...saved,
      qr_code_url: `${process.env.BACKEND_URL}${saved.qr_code_url}`,
    };
    ```

**Success Response** (201 Created):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "course_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_number": 1,
  "title": "Introduction & Basic Greetings",
  "description": "Learn how to introduce yourself and use basic greetings",
  "scheduled_date": "2025-12-01",
  "start_time": "14:00",
  "end_time": "16:00",
  "duration_minutes": 120,
  "livekit_room_name": "course_550e8400_session_1",
  "qr_code_url": "http://localhost:3000/uploads/qr/course_550e8400_session_1.png",
  "status": "scheduled",
  "created_at": "2025-11-26T10:05:00.000Z",
  "updated_at": "2025-11-26T10:05:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | User doesn't own the course |
| 404 | Not Found | Course not found |
| 400 | Bad Request | Validation failed or duplicate session number |
| 500 | Internal Server Error | Database or server error |

---

### Flow 3: Publish Course

**Endpoint**: `PATCH /api/courses/:courseId/publish`

**Authorization**: Teacher (course owner) only

**Request Headers**:
```
Authorization: Bearer {jwt_token}
```

**Path Parameters**:
- `courseId`: UUID of the course

**Process Steps**:

1. **Authenticate & Authorize**:
   ```typescript
   const user = await getUserFromToken(req.headers.authorization);
   const course = await courseRepository.findOne({
     where: { id: courseId },
     relations: ['sessions']
   });
   
   if (!course) {
     throw new NotFoundException('Course not found');
   }
   
   if (course.teacher_id !== user.id) {
     throw new ForbiddenException('You can only publish your own courses');
   }
   ```

2. **Validate Course is Ready**:
   ```typescript
   // Check has at least 1 session
   if (course.total_sessions === 0 || !course.sessions || course.sessions.length === 0) {
     throw new BadRequestException('Course must have at least one session to be published');
   }
   
   // Check pricing is set
   if (!course.price_full_course && !course.price_per_session) {
     throw new BadRequestException('Course must have pricing set (full course or per session)');
   }
   ```

3. **Update Course Status**:
   ```typescript
   course.status = CourseStatus.PUBLISHED;
   course.is_published = true;
   ```

4. **Save Changes**:
   ```typescript
   const updated = await courseRepository.save(course);
   ```

5. **Return Response**:
   ```typescript
   return {
     id: updated.id,
     status: updated.status,
     is_published: updated.is_published,
     updated_at: updated.updated_at,
   };
   ```

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "published",
  "is_published": true,
  "updated_at": "2025-11-26T10:10:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | User doesn't own the course |
| 404 | Not Found | Course not found |
| 400 | Bad Request | Course not ready (no sessions or no pricing) |
| 500 | Internal Server Error | Database or server error |

---

### Flow 4: Browse Courses (Public)

**Endpoint**: `GET /api/courses`

**Authorization**: None (public endpoint)

**Query Parameters**:
```
?page=1
&limit=20
&category=Language
&level=beginner
&language=English
&search=conversation
&sortBy=created_at
&sortOrder=DESC
&minPrice=0
&maxPrice=200
```

**Query Parameter Descriptions**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | Integer | 1 | Page number for pagination |
| `limit` | Integer | 20 | Items per page (max 100) |
| `category` | String | - | Filter by category |
| `level` | String | - | Filter by level (beginner/intermediate/advanced) |
| `language` | String | - | Filter by teaching language |
| `search` | String | - | Search in title and description |
| `sortBy` | String | created_at | Sort field (created_at, price_full_course, title) |
| `sortOrder` | String | DESC | Sort order (ASC or DESC) |
| `minPrice` | Number | - | Minimum price filter |
| `maxPrice` | Number | - | Maximum price filter |

**Process Steps**:

1. **Build Base Query**:
   ```typescript
   const query = courseRepository
     .createQueryBuilder('course')
     .leftJoinAndSelect('course.teacher', 'teacher')
     .where('course.is_published = :published', { published: true });
   ```

2. **Apply Filters**:
   ```typescript
   // Category filter
   if (category) {
     query.andWhere('course.category = :category', { category });
   }
   
   // Level filter
   if (level) {
     query.andWhere('course.level = :level', { level });
   }
   
   // Language filter
   if (language) {
     query.andWhere('course.language = :language', { language });
   }
   
   // Search filter
   if (search) {
     query.andWhere(
       '(course.title LIKE :search OR course.description LIKE :search)',
       { search: `%${search}%` }
     );
   }
   
   // Price range filter
   if (minPrice !== undefined) {
     query.andWhere('course.price_full_course >= :minPrice', { minPrice });
   }
   if (maxPrice !== undefined) {
     query.andWhere('course.price_full_course <= :maxPrice', { maxPrice });
   }
   ```

3. **Apply Sorting**:
   ```typescript
   const validSortFields = ['created_at', 'price_full_course', 'title', 'current_students'];
   const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
   const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
   
   query.orderBy(`course.${sortField}`, sortDirection);
   ```

4. **Apply Pagination**:
   ```typescript
   const page = Math.max(1, parseInt(req.query.page) || 1);
   const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
   const skip = (page - 1) * limit;
   
   query.skip(skip).take(limit);
   ```

5. **Execute Query**:
   ```typescript
   const [courses, total] = await query.getManyAndCount();
   ```

6. **Format Response**:
   ```typescript
   const data = courses.map(course => ({
     id: course.id,
     title: course.title,
     description: course.description,
     category: course.category,
     level: course.level,
     language: course.language,
     price_full_course: course.price_full_course,
     price_per_session: course.price_per_session,
     max_students: course.max_students,
     current_students: course.current_students,
     total_sessions: course.total_sessions,
     duration_hours: course.duration_hours,
     teacher: {
       id: course.teacher.id,
       username: course.teacher.username,
       email: course.teacher.email,
       avatar_url: course.teacher.avatar_url,
     },
     created_at: course.created_at,
   }));
   
   return {
     data,
     total,
     page,
     limit,
     totalPages: Math.ceil(total / limit),
   };
   ```

**Success Response** (200 OK):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "English Conversation for Beginners",
      "description": "Learn basic English conversation skills",
      "category": "Language",
      "level": "beginner",
      "language": "English",
      "price_full_course": 100.00,
      "price_per_session": 12.00,
      "max_students": 30,
      "current_students": 5,
      "total_sessions": 10,
      "duration_hours": 20,
      "teacher": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "username": "john_teacher",
        "email": "john@example.com",
        "avatar_url": "https://example.com/avatars/john.jpg"
      },
      "created_at": "2025-11-26T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### Flow 5: Get Course Details

**Endpoint**: `GET /api/courses/:courseId`

**Authorization**: None (public endpoint)

**Path Parameters**:
- `courseId`: UUID of the course

**Process Steps**:

1. **Find Course**:
   ```typescript
   const course = await courseRepository.findOne({
     where: { id: courseId, is_published: true },
     relations: ['teacher', 'sessions'],
   });
   
   if (!course) {
     throw new NotFoundException('Course not found');
   }
   ```

2. **Sort Sessions**:
   ```typescript
   course.sessions.sort((a, b) => a.session_number - b.session_number);
   ```

3. **Format Response**:
   ```typescript
   return {
     id: course.id,
     title: course.title,
     description: course.description,
     category: course.category,
     level: course.level,
     language: course.language,
     price_full_course: course.price_full_course,
     price_per_session: course.price_per_session,
     max_students: course.max_students,
     current_students: course.current_students,
     total_sessions: course.total_sessions,
     duration_hours: course.duration_hours,
     status: course.status,
     teacher: {
       id: course.teacher.id,
       username: course.teacher.username,
       email: course.teacher.email,
       avatar_url: course.teacher.avatar_url,
     },
     sessions: course.sessions.map(session => ({
       id: session.id,
       session_number: session.session_number,
       title: session.title,
       description: session.description,
       scheduled_date: session.scheduled_date,
       start_time: session.start_time,
       end_time: session.end_time,
       duration_minutes: session.duration_minutes,
       status: session.status,
     })),
     created_at: course.created_at,
     updated_at: course.updated_at,
   };
   ```

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "English Conversation for Beginners",
  "description": "Learn basic English conversation skills through interactive sessions",
  "category": "Language",
  "level": "beginner",
  "language": "English",
  "price_full_course": 100.00,
  "price_per_session": 12.00,
  "max_students": 30,
  "current_students": 5,
  "total_sessions": 10,
  "duration_hours": 20,
  "status": "published",
  "teacher": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "john_teacher",
    "email": "john@example.com",
    "avatar_url": "https://example.com/avatars/john.jpg"
  },
  "sessions": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "session_number": 1,
      "title": "Introduction & Basic Greetings",
      "description": "Learn how to introduce yourself",
      "scheduled_date": "2025-12-01",
      "start_time": "14:00",
      "end_time": "16:00",
      "duration_minutes": 120,
      "status": "scheduled"
    }
  ],
  "created_at": "2025-11-26T10:00:00.000Z",
  "updated_at": "2025-11-26T10:10:00.000Z"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Not Found | Course not found or not published |
| 500 | Internal Server Error | Database or server error |

---

## 🔌 API Endpoints Summary

### Teacher Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/courses` | Create new course | ✅ | Teacher |
| GET | `/api/courses/me` | Get my courses | ✅ | Teacher |
| PATCH | `/api/courses/:id` | Update course | ✅ | Teacher (owner) |
| DELETE | `/api/courses/:id` | Delete course | ✅ | Teacher (owner) |
| PATCH | `/api/courses/:id/publish` | Publish course | ✅ | Teacher (owner) |
| PATCH | `/api/courses/:id/unpublish` | Unpublish course | ✅ | Teacher (owner) |
| POST | `/api/courses/:id/sessions` | Add session | ✅ | Teacher (owner) |
| PATCH | `/api/courses/:id/sessions/:sid` | Update session | ✅ | Teacher (owner) |
| DELETE | `/api/courses/:id/sessions/:sid` | Delete session | ✅ | Teacher (owner) |

### Public Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/courses` | Browse courses | ❌ | Public |
| GET | `/api/courses/:id` | Get course details | ❌ | Public |
| GET | `/api/courses/:id/sessions` | Get course sessions | ❌ | Public |

---

## ✅ Validation Rules

### Course Validation

```typescript
class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price_full_course?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price_per_session?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  max_students?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_hours?: number;
}
```

### Session Validation

```typescript
class CreateSessionDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  session_number: number;

  @IsNotEmpty()
  @IsString()
  @Length(3, 255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  scheduled_date: string;

  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  start_time: string;

  @IsNotEmpty()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  end_time: string;
}
```

---

## 🚨 Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "title",
      "message": "Title must be between 3 and 255 characters"
    }
  ]
}
```

### Common Error Codes

| Code | Error | When |
|------|-------|------|
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource (e.g., title) |
| 500 | Internal Server Error | Server or database error |

---

## 🧪 Testing Guide

### Manual Testing with Postman

**1. Create Course**:
```bash
POST http://localhost:3000/api/courses
Headers:
  Authorization: Bearer {teacher_token}
  Content-Type: application/json
Body:
{
  "title": "Test Course",
  "description": "Test description",
  "category": "Language",
  "level": "beginner",
  "price_full_course": 100,
  "price_per_session": 12,
  "max_students": 30
}
```

**2. Add Session**:
```bash
POST http://localhost:3000/api/courses/{courseId}/sessions
Headers:
  Authorization: Bearer {teacher_token}
  Content-Type: application/json
Body:
{
  "session_number": 1,
  "title": "Session 1",
  "scheduled_date": "2025-12-01",
  "start_time": "14:00",
  "end_time": "16:00"
}
```

**3. Publish Course**:
```bash
PATCH http://localhost:3000/api/courses/{courseId}/publish
Headers:
  Authorization: Bearer {teacher_token}
```

**4. Browse Courses**:
```bash
GET http://localhost:3000/api/courses?page=1&limit=20
```

**5. Get Course Details**:
```bash
GET http://localhost:3000/api/courses/{courseId}
```

---

## 📊 Database Indexes

### Recommended Indexes

```sql
-- Courses table
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_created ON courses(created_at);

-- Course Sessions table
CREATE INDEX idx_sessions_course ON course_sessions(course_id);
CREATE INDEX idx_sessions_date ON course_sessions(scheduled_date);
CREATE INDEX idx_sessions_status ON course_sessions(status);
CREATE UNIQUE INDEX idx_sessions_number ON course_sessions(course_id, session_number);
```

---

## 🎯 Success Criteria

Phase 1 is complete when:

- ✅ Teachers can create courses
- ✅ Teachers can add/edit/delete sessions
- ✅ Teachers can publish/unpublish courses
- ✅ QR codes are generated for sessions
- ✅ LiveKit room names are generated
- ✅ Students can browse published courses
- ✅ Students can view course details
- ✅ All endpoints return proper responses
- ✅ All validations work correctly
- ✅ All error cases are handled

---

**End of Phase 1 Documentation**
