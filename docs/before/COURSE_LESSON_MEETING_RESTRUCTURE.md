# 📚 Course → Session → Lesson → Meeting Restructure

**Version**: 2.0  
**Status**: 🔄 **MAJOR REFACTOR**  
**Priority**: Critical  
**Estimated Time**: 5-7 days

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current vs New Structure](#current-vs-new-structure)
3. [Database Schema](#database-schema)
4. [Entity Definitions](#entity-definitions)
5. [Migration Strategy](#migration-strategy)
6. [Business Logic Changes](#business-logic-changes)
7. [API Changes](#api-changes)
8. [Frontend Changes](#frontend-changes)
9. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Purpose

Tái cấu trúc hệ thống Course để hỗ trợ **3 cấp độ**:
1. **Course** - Khóa học (ví dụ: "English Conversation")
2. **Session** - Phần lớn/Tuần (ví dụ: "Week 1", "Module 1")
3. **Lesson** - Buổi học cụ thể (ví dụ: "Monday Class", "Lesson 1.1")
4. **Meeting** - Phòng LiveKit cho lesson

### Key Changes

- ✅ Session không còn là buổi học, mà là **nhóm lessons**
- ✅ Lesson là buổi học thực tế (thay thế Session cũ)
- ✅ Meeting có `lesson_id` (nullable) để link với lesson
- ✅ Meeting có tab **Materials** mới (cùng với Participants, Chat, YouTube)
- ✅ Tự động tạo Meeting khi tạo Lesson

---

## 🔄 Current vs New Structure

### **CŨ** (Hiện tại):

```
Course: "English Conversation"
  ├── Session 1: "Introduction & Greetings"
  │    └── Meeting (LiveKit room)
  ├── Session 2: "Daily Conversations"
  │    └── Meeting (LiveKit room)
  └── Session 3: "Shopping & Dining"
       └── Meeting (LiveKit room)
```

**Vấn đề**:
- ❌ Không linh hoạt (1 session = 1 meeting)
- ❌ Không thể nhóm lessons theo tuần/module
- ❌ Khó quản lý nhiều buổi học trong 1 chủ đề

---

### **MỚI** (Đề xuất):

```
Course: "English Conversation" (100 credits)
  │
  ├── Session 1: "Week 1 - Basics" (Nhóm lessons)
  │    ├── Lesson 1.1: "Monday - Introduction"
  │    │    ├── scheduled_date: 2025-12-02
  │    │    ├── start_time: 14:00
  │    │    ├── end_time: 16:00
  │    │    └── Meeting (LiveKit)
  │    │         ├── title: "English Conversation - Week 1 - Monday - Introduction"
  │    │         ├── host: Teacher John
  │    │         ├── Participants tab
  │    │         ├── Chat tab
  │    │         ├── YouTube Player tab
  │    │         └── Materials tab ⭐ NEW
  │    │              ├── 📄 Lesson Notes.pdf
  │    │              ├── 🎥 Pronunciation Guide.mp4
  │    │              └── 🔗 Grammar Resources
  │    │
  │    ├── Lesson 1.2: "Wednesday - Basic Greetings"
  │    │    ├── scheduled_date: 2025-12-04
  │    │    └── Meeting (LiveKit)
  │    │
  │    └── Lesson 1.3: "Friday - Practice Session"
  │         ├── scheduled_date: 2025-12-06
  │         └── Meeting (LiveKit)
  │
  ├── Session 2: "Week 2 - Daily Life"
  │    ├── Lesson 2.1: "Monday - Shopping"
  │    │    └── Meeting (LiveKit)
  │    ├── Lesson 2.2: "Wednesday - Dining"
  │    │    └── Meeting (LiveKit)
  │    └── Lesson 2.3: "Friday - Transportation"
  │         └── Meeting (LiveKit)
  │
  └── Session 3: "Week 3 - Advanced Topics"
       └── ... (similar structure)
```

**Ưu điểm**:
- ✅ Linh hoạt: 1 session có nhiều lessons
- ✅ Dễ quản lý: Nhóm theo tuần/module
- ✅ Rõ ràng: Mỗi lesson = 1 buổi học cụ thể
- ✅ Tự động: Tạo meeting khi tạo lesson

---

## 🗄️ Database Schema

### New Tables

#### 1. `lessons` (NEW)

```sql
CREATE TABLE lessons (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  lesson_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  duration_minutes INT NOT NULL,
  
  -- Meeting info (auto-generated)
  meeting_id VARCHAR(36),
  livekit_room_name VARCHAR(255),
  meeting_link VARCHAR(500),
  qr_code_url VARCHAR(500),
  qr_code_data TEXT,
  
  -- Status
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_session_lesson (session_id, lesson_number),
  INDEX idx_session_id (session_id),
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_scheduled_date (scheduled_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2. `lesson_materials` (NEW)

```sql
CREATE TABLE lesson_materials (
  id VARCHAR(36) PRIMARY KEY,
  lesson_id VARCHAR(36) NOT NULL,
  type ENUM('document', 'video', 'link') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INT,
  file_type VARCHAR(100),
  display_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson_id (lesson_id),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Modified Tables

#### 3. `course_sessions` (MODIFIED)

```sql
ALTER TABLE course_sessions
-- Remove meeting-specific fields (moved to lessons)
DROP COLUMN scheduled_date,
DROP COLUMN start_time,
DROP COLUMN end_time,
DROP COLUMN duration_minutes,
DROP COLUMN livekit_room_name,
DROP COLUMN meeting_link,
DROP COLUMN meeting_id,
DROP COLUMN qr_code_url,
DROP COLUMN qr_code_data,

-- Add new fields
ADD COLUMN total_lessons INT DEFAULT 0,
ADD COLUMN description TEXT AFTER title;

-- Sessions now only contain:
-- - session_number
-- - title (e.g., "Week 1", "Module 1")
-- - description
-- - total_lessons
-- - status
```

#### 4. `meetings` (MODIFIED)

```sql
ALTER TABLE meetings
ADD COLUMN lesson_id VARCHAR(36) NULL AFTER classroom_id,
ADD COLUMN course_id VARCHAR(36) NULL AFTER lesson_id,
ADD COLUMN session_id VARCHAR(36) NULL AFTER course_id,
ADD COLUMN teacher_name VARCHAR(255) NULL,
ADD COLUMN subject_name VARCHAR(255) NULL,
ADD FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
ADD FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE SET NULL,
ADD INDEX idx_lesson_id (lesson_id),
ADD INDEX idx_course_id (course_id),
ADD INDEX idx_session_id (session_id);

-- lesson_id is NULLABLE because meetings can be:
-- - Course lesson meetings (lesson_id NOT NULL)
-- - Free talk rooms (lesson_id NULL)
-- - Private sessions (lesson_id NULL)
-- - Workshops (lesson_id NULL)
```

---

## 🔧 Entity Definitions

### 1. Lesson Entity

**File**: `src/features/courses/entities/lesson.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CourseSession } from './course-session.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { LessonMaterial } from './lesson-material.entity';

export enum LessonStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('lessons')
@Index(['session_id'])
@Index(['meeting_id'])
@Index(['scheduled_date'])
@Index(['status'])
@Index(['session_id', 'lesson_number'], { unique: true })
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Session reference
  @Column({ type: 'varchar', length: 36 })
  session_id: string;

  // Lesson number within session
  @Column({ type: 'int' })
  lesson_number: number;

  // Lesson info
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Schedule
  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'varchar', length: 10 })
  start_time: string; // "HH:MM"

  @Column({ type: 'varchar', length: 10 })
  end_time: string; // "HH:MM"

  @Column({ type: 'int' })
  duration_minutes: number;

  // Meeting info (auto-generated)
  @Column({ type: 'varchar', length: 36, nullable: true })
  meeting_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  livekit_room_name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  meeting_link: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  qr_code_url: string;

  @Column({ type: 'text', nullable: true })
  qr_code_data: string;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: LessonStatus,
    default: LessonStatus.SCHEDULED,
  })
  status: LessonStatus;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => CourseSession, (session) => session.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;

  @OneToOne(() => Meeting, { nullable: true })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @OneToMany(() => LessonMaterial, (material) => material.lesson, {
    cascade: true,
  })
  materials: LessonMaterial[];
}
```

---

### 2. LessonMaterial Entity

**File**: `src/features/courses/entities/lesson-material.entity.ts`

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
import { Lesson } from './lesson.entity';

export enum MaterialType {
  DOCUMENT = 'document',
  VIDEO = 'video',
  LINK = 'link',
}

@Entity('lesson_materials')
@Index(['lesson_id'])
@Index(['type'])
export class LessonMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  lesson_id: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: MaterialType,
  })
  type: MaterialType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name: string;

  @Column({ type: 'int', nullable: true })
  file_size: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  file_type: string;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Lesson, (lesson) => lesson.materials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;
}
```

---

### 3. Updated CourseSession Entity

**File**: `src/features/courses/entities/course-session.entity.ts`

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
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

export enum SessionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('course_sessions')
@Index(['course_id'])
@Index(['status'])
export class CourseSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  course_id: string;

  @Column({ type: 'int' })
  session_number: number;

  // Session is now a GROUP of lessons
  @Column({ type: 'varchar', length: 255 })
  title: string; // e.g., "Week 1", "Module 1: Basics"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  total_lessons: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: SessionStatus.DRAFT,
    enum: SessionStatus,
  })
  status: SessionStatus;

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

  @OneToMany(() => Lesson, (lesson) => lesson.session, {
    cascade: true,
  })
  lessons: Lesson[];
}
```

---

### 4. Updated Meeting Entity

**File**: `src/features/meeting/entities/meeting.entity.ts`

```typescript
// Add these fields to existing Meeting entity:

@Column({ type: 'varchar', length: 36, nullable: true })
lesson_id: string;

@Column({ type: 'varchar', length: 36, nullable: true })
course_id: string;

@Column({ type: 'varchar', length: 36, nullable: true })
session_id: string;

@Column({ type: 'varchar', length: 255, nullable: true })
teacher_name: string;

@Column({ type: 'varchar', length: 255, nullable: true })
subject_name: string;

// Relations
@ManyToOne(() => Lesson, { nullable: true })
@JoinColumn({ name: 'lesson_id' })
lesson: Lesson;

@ManyToOne(() => Course, { nullable: true })
@JoinColumn({ name: 'course_id' })
course: Course;

@ManyToOne(() => CourseSession, { nullable: true })
@JoinColumn({ name: 'session_id' })
session: CourseSession;
```

---

## 📝 DTOs

### CreateCourseWithSessionsDto

```typescript
export class CreateLessonMaterialDto {
  @IsString()
  type: 'document' | 'video' | 'link';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsNumber()
  file_size?: number;

  @IsOptional()
  @IsString()
  file_type?: string;

  @IsOptional()
  @IsNumber()
  display_order?: number;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class CreateLessonDto {
  @IsNumber()
  @Min(1)
  lesson_number: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  scheduled_date: string; // YYYY-MM-DD

  @IsString()
  start_time: string; // HH:MM

  @IsString()
  end_time: string; // HH:MM

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonMaterialDto)
  materials?: CreateLessonMaterialDto[];
}

export class CreateSessionWithLessonsDto {
  @IsNumber()
  @Min(1)
  session_number: number;

  @IsString()
  title: string; // e.g., "Week 1", "Module 1"

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  lessons: CreateLessonDto[];
}

export class CreateCourseWithSessionsDto {
  // Course info
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: 'beginner' | 'intermediate' | 'advanced';

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  price_full_course?: number;

  @IsOptional()
  @IsNumber()
  price_per_session?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  max_students?: number;

  @IsOptional()
  @IsNumber()
  duration_hours?: number;

  // Sessions with lessons
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionWithLessonsDto)
  sessions: CreateSessionWithLessonsDto[];
}
```

---

## 🔄 Service Implementation

### CoursesService.createCourseWithSessions()

```typescript
async createCourseWithSessions(
  teacherId: string,
  dto: CreateCourseWithSessionsDto,
): Promise<Course> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Create course
    const course = manager.create(Course, {
      teacher_id: teacherId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      level: dto.level,
      language: dto.language,
      price_full_course: dto.price_full_course,
      price_per_session: dto.price_per_session,
      max_students: dto.max_students || 30,
      duration_hours: dto.duration_hours,
      total_sessions: dto.sessions.length,
      status: CourseStatus.DRAFT,
      is_published: false,
    });

    const savedCourse = await manager.save(Course, course);

    // 2. Create sessions with lessons
    for (const sessionDto of dto.sessions) {
      // Create session (group of lessons)
      const session = manager.create(CourseSession, {
        course_id: savedCourse.id,
        session_number: sessionDto.session_number,
        title: sessionDto.title,
        description: sessionDto.description,
        total_lessons: sessionDto.lessons.length,
        status: SessionStatus.DRAFT,
      });

      const savedSession = await manager.save(CourseSession, session);

      // 3. Create lessons for this session
      for (const lessonDto of sessionDto.lessons) {
        // Calculate duration
        const duration = this.calculateDurationMinutes(
          lessonDto.start_time,
          lessonDto.end_time,
        );

        // Generate LiveKit room name
        const livekitRoomName = `course_${savedCourse.id}_session_${sessionDto.session_number}_lesson_${lessonDto.lesson_number}`;

        // Generate meeting title
        const meetingTitle = `${savedCourse.title} - ${sessionDto.title} - ${lessonDto.title}`;

        // Get teacher info
        const teacher = await manager.findOne(User, {
          where: { id: teacherId },
        });

        // 4. Create Meeting first
        const meeting = manager.create(Meeting, {
          title: meetingTitle,
          description: lessonDto.description,
          host: teacher,
          lesson_id: null, // Will be set after lesson is created
          course_id: savedCourse.id,
          session_id: savedSession.id,
          teacher_name: teacher.username,
          subject_name: savedCourse.title,
          scheduled_at: new Date(`${lessonDto.scheduled_date} ${lessonDto.start_time}`),
          max_participants: savedCourse.max_students,
          meeting_type: MeetingType.TEACHER_CLASS,
          status: MeetingStatus.SCHEDULED,
          settings: {
            allow_screen_share: true,
            allow_chat: true,
            allow_reactions: true,
            record_meeting: true,
          },
        });

        const savedMeeting = await manager.save(Meeting, meeting);

        // 5. Create Lesson
        const qrData = {
          course_id: savedCourse.id,
          session_id: savedSession.id,
          lesson_id: null, // Will be set after save
          lesson_number: lessonDto.lesson_number,
          title: lessonDto.title,
          date: lessonDto.scheduled_date,
          time: lessonDto.start_time,
          room: livekitRoomName,
          meeting_id: savedMeeting.id,
        };

        const qrCodeUrl = await this.qrCodeService.generateQRCode(qrData);

        const lesson = manager.create(Lesson, {
          session_id: savedSession.id,
          lesson_number: lessonDto.lesson_number,
          title: lessonDto.title,
          description: lessonDto.description,
          scheduled_date: lessonDto.scheduled_date,
          start_time: lessonDto.start_time,
          end_time: lessonDto.end_time,
          duration_minutes: duration,
          meeting_id: savedMeeting.id,
          livekit_room_name: livekitRoomName,
          meeting_link: `${process.env.FRONTEND_URL}/meeting/${savedMeeting.id}`,
          qr_code_url: qrCodeUrl,
          qr_code_data: JSON.stringify(qrData),
          status: LessonStatus.SCHEDULED,
        });

        const savedLesson = await manager.save(Lesson, lesson);

        // 6. Update Meeting with lesson_id
        await manager.update(Meeting, savedMeeting.id, {
          lesson_id: savedLesson.id,
        });

        // 7. Create materials for this lesson
        if (lessonDto.materials && lessonDto.materials.length > 0) {
          for (const materialDto of lessonDto.materials) {
            const material = manager.create(LessonMaterial, {
              lesson_id: savedLesson.id,
              type: materialDto.type,
              title: materialDto.title,
              description: materialDto.description,
              file_url: materialDto.file_url,
              file_name: materialDto.file_name,
              file_size: materialDto.file_size,
              file_type: materialDto.file_type,
              display_order: materialDto.display_order || 0,
              is_required: materialDto.is_required || false,
            });

            await manager.save(LessonMaterial, material);
          }
        }
      }
    }

    // Return course with full relations
    return await manager.findOne(Course, {
      where: { id: savedCourse.id },
      relations: [
        'sessions',
        'sessions.lessons',
        'sessions.lessons.materials',
        'sessions.lessons.meeting',
      ],
    });
  });
}
```

---

## 🎨 Frontend UI Flow

### Step 1: Course Basic Info

```typescript
interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  price_full_course: number;
  price_per_session: number;
  max_students: number;
  duration_hours: number;
  total_sessions: number; // User inputs this
}
```

### Step 2: Sessions & Lessons

```typescript
interface SessionFormData {
  session_number: number;
  title: string; // e.g., "Week 1"
  description: string;
  total_lessons: number; // User inputs this
  lessons: LessonFormData[];
}

interface LessonFormData {
  lesson_number: number;
  title: string; // e.g., "Monday Class"
  description: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  materials: MaterialFormData[];
}

interface MaterialFormData {
  type: 'document' | 'video' | 'link';
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
}
```

### UI Example:

```
┌─────────────────────────────────────────────┐
│ Step 1: Course Info                         │
├─────────────────────────────────────────────┤
│ Title: English Conversation                 │
│ Total Sessions: [3]  ← User inputs          │
│                                             │
│ [Next: Configure Sessions]                  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Step 2: Configure Sessions                  │
├─────────────────────────────────────────────┤
│ Session 1 of 3                              │
│ Title: Week 1 - Basics                      │
│ Total Lessons: [3]  ← User inputs           │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Lesson 1.1                              │ │
│ │ Title: Monday - Introduction            │ │
│ │ Date: [2025-12-02]                      │ │
│ │ Time: [14:00] - [16:00]                 │ │
│ │                                         │ │
│ │ Materials:                              │ │
│ │ [+ Add Document] [+ Add Video] [+ Link] │ │
│ │                                         │ │
│ │ • 📄 Lesson Notes.pdf                   │ │
│ │ • 🎥 Intro Video.mp4                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Lesson 1.2                              │ │
│ │ ... (similar)                           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Lesson 1.3                              │ │
│ │ ... (similar)                           │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

... (Session 2, Session 3 similar)

[Back] [Save as Draft] [Publish Course]
```

---

## 📱 Meeting Room UI - Materials Tab

### Meeting Interface

```typescript
interface MeetingTabs {
  participants: ParticipantData[];
  chat: ChatMessage[];
  youtube: YouTubePlayer;
  materials: LessonMaterial[]; // ⭐ NEW
}
```

### Materials Tab UI

```
┌─────────────────────────────────────────────┐
│ Meeting: English Conversation - Week 1     │
│          Monday - Introduction              │
│ Teacher: John Doe                           │
├─────────────────────────────────────────────┤
│ [Participants] [Chat] [YouTube] [Materials] │ ← NEW TAB
├─────────────────────────────────────────────┤
│ 📚 Lesson Materials                         │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📄 Lesson 1 Notes.pdf                   │ │
│ │ Size: 2.5 MB                            │ │
│ │ Required: Yes                           │ │
│ │ [Download] [View]                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🎥 Pronunciation Guide.mp4              │ │
│ │ Size: 15 MB                             │ │
│ │ Required: No                            │ │
│ │ [Download] [Play]                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔗 Grammar Resources                    │ │
│ │ https://grammar.example.com             │ │
│ │ [Open Link]                             │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🔄 Migration Strategy

### Phase 1: Database Migration

```sql
-- 1. Create new tables
CREATE TABLE lessons (...);
CREATE TABLE lesson_materials (...);

-- 2. Modify existing tables
ALTER TABLE meetings ADD COLUMN lesson_id VARCHAR(36) NULL;
ALTER TABLE meetings ADD COLUMN course_id VARCHAR(36) NULL;
ALTER TABLE meetings ADD COLUMN session_id VARCHAR(36) NULL;
ALTER TABLE meetings ADD COLUMN teacher_name VARCHAR(255) NULL;
ALTER TABLE meetings ADD COLUMN subject_name VARCHAR(255) NULL;

-- 3. Migrate existing data
-- For each existing course_session:
--   - Create 1 lesson from session data
--   - Update session to remove lesson-specific fields
--   - Link meeting to lesson

-- 4. Drop old columns from course_sessions
ALTER TABLE course_sessions
DROP COLUMN scheduled_date,
DROP COLUMN start_time,
DROP COLUMN end_time,
DROP COLUMN duration_minutes,
DROP COLUMN livekit_room_name,
DROP COLUMN meeting_link,
DROP COLUMN meeting_id,
DROP COLUMN qr_code_url,
DROP COLUMN qr_code_data;

-- 5. Add new columns to course_sessions
ALTER TABLE course_sessions
ADD COLUMN total_lessons INT DEFAULT 0,
ADD COLUMN description TEXT;
```

### Phase 2: Code Migration

1. **Create new entities**: Lesson, LessonMaterial
2. **Update entities**: CourseSession, Meeting
3. **Create new services**: LessonService
4. **Update services**: CoursesService, MeetingService
5. **Create new DTOs**: CreateLessonDto, etc.
6. **Update controllers**: Add lesson endpoints
7. **Update frontend**: New UI for sessions/lessons

### Phase 3: Testing

1. Test course creation with sessions & lessons
2. Test lesson material upload
3. Test meeting creation from lesson
4. Test meeting room materials tab
5. Test enrollment flow
6. Test payment flow

---

## 📋 Implementation Checklist

### Backend:
- [ ] Create `Lesson` entity
- [ ] Create `LessonMaterial` entity
- [ ] Update `CourseSession` entity
- [ ] Update `Meeting` entity
- [ ] Create database migration
- [ ] Migrate existing data
- [ ] Create `LessonService`
- [ ] Update `CoursesService.createCourseWithSessions()`
- [ ] Update `MeetingService` to handle lesson meetings
- [ ] Create lesson endpoints
- [ ] Add materials to meeting response

### Frontend:
- [ ] Update course creation form (multi-step)
- [ ] Add session configuration step
- [ ] Add lesson configuration step
- [ ] Add material upload UI
- [ ] Update meeting room UI
- [ ] Add Materials tab to meeting
- [ ] Update course detail page
- [ ] Update enrollment flow

---

## 🎯 Benefits

✅ **Flexible Structure**: Sessions group lessons logically  
✅ **Better Organization**: Week/Module based grouping  
✅ **Rich Content**: Materials per lesson  
✅ **Auto Meeting Creation**: No manual setup  
✅ **Clear Hierarchy**: Course → Session → Lesson → Meeting  
✅ **Scalable**: Easy to add more lessons  

---

**End of Restructure Documentation**
