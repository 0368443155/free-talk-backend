# 📚 Phase 1 Enhancement: Session Materials

**Version**: 1.1  
**Status**: 🆕 **NEW FEATURE**  
**Priority**: High  
**Estimated Time**: 2-3 hours

---

## 📋 Overview

Thêm khả năng upload **materials** (tài liệu, video) cho mỗi session và cho phép tạo course + sessions cùng lúc.

---

## 🗄️ New Database Table

### session_materials

```sql
CREATE TABLE session_materials (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
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
  
  FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_type (type)
);
```

---

## 🔧 Entity Definition

**File**: `src/features/courses/entities/session-material.entity.ts`

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
import { CourseSession } from './course-session.entity';

export enum MaterialType {
  DOCUMENT = 'document',
  VIDEO = 'video',
  LINK = 'link',
}

@Entity('session_materials')
@Index(['session_id'])
@Index(['type'])
export class SessionMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  session_id: string;

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

  @ManyToOne(() => CourseSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: CourseSession;
}
```

---

## 📝 DTOs

### CreateCourseWithSessionsDto

```typescript
import { Type } from 'class-transformer';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsArray, 
  ValidateNested,
  Min,
  Max,
} from 'class-validator';

export class CreateSessionMaterialDto {
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
  is_required?: boolean;
}

export class CreateSessionWithMaterialsDto {
  @IsNumber()
  @Min(1)
  session_number: number;

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
  @Type(() => CreateSessionMaterialDto)
  materials?: CreateSessionMaterialDto[];
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

  // Sessions
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSessionWithMaterialsDto)
  sessions: CreateSessionWithMaterialsDto[];
}
```

---

## 🔄 Service Method

**File**: `src/features/courses/courses.service.ts`

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

    // 2. Create sessions with materials
    for (const sessionDto of dto.sessions) {
      // Calculate duration
      const duration = this.calculateDurationMinutes(
        sessionDto.start_time,
        sessionDto.end_time,
      );

      // Generate LiveKit room name
      const livekitRoomName = `course_${savedCourse.id}_session_${sessionDto.session_number}`;

      // Generate QR code
      const qrData = {
        course_id: savedCourse.id,
        session_number: sessionDto.session_number,
        title: sessionDto.title,
        date: sessionDto.scheduled_date,
        time: sessionDto.start_time,
        room: livekitRoomName,
      };

      const qrCodeUrl = await this.qrCodeService.generateQRCode(qrData);

      // Create session
      const session = manager.create(CourseSession, {
        course_id: savedCourse.id,
        session_number: sessionDto.session_number,
        title: sessionDto.title,
        description: sessionDto.description,
        scheduled_date: sessionDto.scheduled_date,
        start_time: sessionDto.start_time,
        end_time: sessionDto.end_time,
        duration_minutes: duration,
        livekit_room_name: livekitRoomName,
        qr_code_url: qrCodeUrl,
        qr_code_data: JSON.stringify(qrData),
        status: SessionStatus.SCHEDULED,
      });

      const savedSession = await manager.save(CourseSession, session);

      // 3. Create materials for this session
      if (sessionDto.materials && sessionDto.materials.length > 0) {
        for (const materialDto of sessionDto.materials) {
          const material = manager.create(SessionMaterial, {
            session_id: savedSession.id,
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

          await manager.save(SessionMaterial, material);
        }
      }
    }

    // Return course with sessions and materials
    return await manager.findOne(Course, {
      where: { id: savedCourse.id },
      relations: ['sessions', 'sessions.materials'],
    });
  });
}
```

---

## 🎯 API Endpoint

```typescript
@Post('with-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
@ApiBearerAuth()
@ApiOperation({ summary: 'Create course with sessions and materials' })
async createCourseWithSessions(
  @Req() req: any,
  @Body() dto: CreateCourseWithSessionsDto,
) {
  const teacherId = req.user.id;
  return this.coursesService.createCourseWithSessions(teacherId, dto);
}
```

---

## 📤 Frontend Form Structure

```typescript
interface SessionFormData {
  session_number: number;
  title: string;
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

interface CourseFormData {
  // Course info
  title: string;
  description: string;
  category: string;
  level: string;
  language: string;
  price_full_course: number;
  price_per_session: number;
  max_students: number;
  duration_hours: number;
  
  // Sessions
  total_sessions: number;
  sessions: SessionFormData[];
}
```

---

## 🎨 UI Flow

### Step 1: Course Basic Info
```
┌─────────────────────────────────┐
│ Course Title: [____________]    │
│ Description:  [____________]    │
│ Category:     [____________]    │
│ Level:        [▼ Beginner   ]   │
│ Language:     [____________]    │
│ Price:        [$___________]    │
│ Max Students: [30__________]    │
│                                 │
│ Total Sessions: [5_________]    │ ← Nhập số này
│                                 │
│         [Next: Add Sessions]    │
└─────────────────────────────────┘
```

### Step 2: Sessions Details (Dynamic)
```
┌─────────────────────────────────┐
│ Session 1 of 5                  │ ← Auto-generate 5 forms
├─────────────────────────────────┤
│ Title:        [____________]    │
│ Description:  [____________]    │
│ Date:         [2025-12-01__]    │
│ Start Time:   [14:00_______]    │
│ End Time:     [16:00_______]    │
│                                 │
│ Materials:                      │
│ ┌─────────────────────────────┐ │
│ │ [+ Add Document]            │ │
│ │ [+ Add Video]               │ │
│ │ [+ Add Link]                │ │
│ └─────────────────────────────┘ │
│                                 │
│ Added Materials:                │
│ • 📄 Lesson 1 Notes.pdf        │
│ • 🎥 Introduction Video.mp4    │
│ • 🔗 Additional Resources       │
└─────────────────────────────────┘

... (Session 2, 3, 4, 5 similar)

[Back] [Save as Draft] [Publish Course]
```

---

## 📋 Migration SQL

```sql
CREATE TABLE session_materials (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id VARCHAR(36) NOT NULL,
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
  
  FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## ✅ Implementation Checklist

### Backend:
- [ ] Create `SessionMaterial` entity
- [ ] Create migration for `session_materials` table
- [ ] Create DTOs (`CreateCourseWithSessionsDto`, etc.)
- [ ] Implement `createCourseWithSessions()` service method
- [ ] Add endpoint `POST /api/courses/with-sessions`
- [ ] Update `CourseSession` entity to include `materials` relation
- [ ] Add file upload handling for materials

### Frontend:
- [ ] Create `CreateCourseForm` component with steps
- [ ] Step 1: Basic course info + total_sessions input
- [ ] Step 2: Dynamic session forms (based on total_sessions)
- [ ] Add material upload UI for each session
- [ ] Handle file uploads (documents, videos)
- [ ] Add validation for all fields
- [ ] Show preview before submit

---

## 🎯 Benefits

✅ **Better UX**: Create course + sessions in one flow  
✅ **Rich Content**: Each session has materials  
✅ **Organized**: Materials linked to specific sessions  
✅ **Flexible**: Support documents, videos, links  
✅ **Required Materials**: Mark materials as required  

---

**End of Enhancement Guide**
