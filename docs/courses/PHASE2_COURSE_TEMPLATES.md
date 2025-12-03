# 📋 PHASE 2: Course Templates System

**Timeline**: 5 ngày  
**Priority**: 🔥 High  
**Dependencies**: Phase 1 (CQRS)  
**Status**: 📋 Ready to Start

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Database Design](#database-design)
3. [Implementation Guide](#implementation-guide)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [Checklist](#checklist)

---

## 🎯 TỔNG QUAN

### Mục Tiêu

**Cho phép giáo viên tạo và sử dụng templates để tạo khóa học nhanh chóng**

### Use Cases

```
👨‍🏫 Teacher Use Cases:
├── Tạo template từ khóa học hiện có
├── Tạo template từ đầu
├── Sử dụng template để tạo khóa học mới
├── Chia sẻ template với cộng đồng
├── Browse template marketplace
└── Rate & review templates

🎓 Platform Use Cases:
├── Curate featured templates
├── Track template usage
├── Analyze popular templates
└── Suggest templates to teachers
```

### Benefits

```
✅ Tăng Tốc Độ Tạo Khóa Học
   ├── Từ 30 phút → 5 phút
   ├── Giảm lỗi nhập liệu
   └── Consistency cao

✅ Best Practices Sharing
   ├── Teachers học từ nhau
   ├── Proven course structures
   └── Community-driven improvement

✅ Platform Growth
   ├── Nhiều khóa học hơn
   ├── Chất lượng đồng đều
   └── Network effects
```

---

## 🗄️ DATABASE DESIGN

### Schema

```sql
-- Course Templates Table
CREATE TABLE course_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Ownership
  created_by VARCHAR(36) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Categorization
  category VARCHAR(100),
  level VARCHAR(50),
  language VARCHAR(50),
  
  -- Structure Metadata
  total_sessions INT NOT NULL,
  sessions_per_week INT,
  total_duration_hours INT,
  
  -- Template Data (JSON)
  session_structure JSON NOT NULL,
  lesson_structure JSON,
  default_materials JSON,
  
  -- Pricing Suggestions
  suggested_price_full DECIMAL(10,2),
  suggested_price_session DECIMAL(10,2),
  
  -- Usage Statistics
  usage_count INT DEFAULT 0,
  rating DECIMAL(3,2),
  total_ratings INT DEFAULT 0,
  
  -- Metadata
  tags JSON,
  thumbnail_url VARCHAR(500),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  -- Indexes
  INDEX idx_category (category),
  INDEX idx_level (level),
  INDEX idx_is_public (is_public),
  INDEX idx_is_featured (is_featured),
  INDEX idx_created_by (created_by),
  INDEX idx_usage_count (usage_count DESC),
  INDEX idx_rating (rating DESC)
);

-- Template Ratings Table
CREATE TABLE template_ratings (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES course_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  
  UNIQUE KEY unique_user_template (template_id, user_id),
  INDEX idx_template (template_id),
  INDEX idx_rating (rating)
);

-- Template Usage Tracking
CREATE TABLE template_usage (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NOT NULL,
  used_by VARCHAR(36) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES course_templates(id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (used_by) REFERENCES users(id),
  
  INDEX idx_template (template_id),
  INDEX idx_used_by (used_by)
);
```

### JSON Structure Examples

```json
// session_structure
[
  {
    "sessionNumber": 1,
    "title": "Introduction & Basics",
    "description": "Getting started with the fundamentals",
    "durationMinutes": 120,
    "topics": ["Introduction", "Basic Concepts", "Q&A"],
    "lessonCount": 3
  },
  {
    "sessionNumber": 2,
    "title": "Intermediate Concepts",
    "description": "Building on the basics",
    "durationMinutes": 120,
    "topics": ["Review", "New Concepts", "Practice"],
    "lessonCount": 4
  }
]

// lesson_structure
[
  {
    "sessionNumber": 1,
    "lessons": [
      {
        "lessonNumber": 1,
        "title": "Welcome & Overview",
        "description": "Course introduction",
        "durationMinutes": 30,
        "type": "lecture"
      },
      {
        "lessonNumber": 2,
        "title": "Basic Vocabulary",
        "description": "Essential words and phrases",
        "durationMinutes": 45,
        "type": "interactive"
      }
    ]
  }
]

// default_materials
[
  {
    "sessionNumber": 1,
    "lessonNumber": 1,
    "materials": [
      {
        "title": "Course Syllabus",
        "type": "pdf",
        "description": "Complete course outline"
      },
      {
        "title": "Welcome Video",
        "type": "video",
        "description": "Introduction video"
      }
    ]
  }
]

// tags
["english", "conversation", "beginner", "business"]
```

### ⚠️ Cảnh Báo Kỹ Thuật: JSON Columns

> **Cập nhật**: 2025-12-03  
> **Nguồn**: Database Performance Review

#### 1. JSON Query Performance

**Vấn đề**: Truy vấn sâu vào JSON column sẽ **CHẬM** khi dữ liệu lớn

**Ví dụ query có vấn đề**:
```sql
-- Tìm tất cả templates có bài học về "Grammar"
SELECT * FROM course_templates 
WHERE JSON_SEARCH(session_structure, 'one', 'Grammar', NULL, '$[*].topics') IS NOT NULL;

-- Query này sẽ CHẬM vì:
-- 1. Không thể dùng index
-- 2. Phải scan toàn bộ JSON của mọi row
-- 3. O(n) complexity
```

**Giải pháp**:

**Option 1: Denormalization (Khuyến nghị)**
```sql
-- Thêm cột denormalized cho frequently queried fields
ALTER TABLE course_templates 
ADD COLUMN all_topics TEXT,  -- Comma-separated topics
ADD FULLTEXT INDEX idx_topics (all_topics);

-- Khi insert/update template:
UPDATE course_templates 
SET all_topics = 'Introduction,Basic Concepts,Q&A,Review,New Concepts,Practice'
WHERE id = '...';

-- Query nhanh hơn:
SELECT * FROM course_templates 
WHERE MATCH(all_topics) AGAINST('Grammar' IN BOOLEAN MODE);
```

**Option 2: Separate Table**
```sql
-- Tạo bảng riêng cho topics
CREATE TABLE template_topics (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  session_number INT,
  FOREIGN KEY (template_id) REFERENCES course_templates(id),
  INDEX idx_topic (topic),
  INDEX idx_template (template_id)
);

-- Query nhanh:
SELECT DISTINCT t.* 
FROM course_templates t
JOIN template_topics tt ON t.id = tt.template_id
WHERE tt.topic = 'Grammar';
```

**Khuyến nghị**:
- [ ] Dùng JSON cho data ít thay đổi, không cần search
- [ ] Denormalize các fields cần search thường xuyên
- [ ] Monitor query performance với EXPLAIN
- [ ] Set up slow query log

#### 2. Template Cloning Strategy

**Vấn đề**: Apply template sang Course - Copy by reference hay deep clone?

**Scenario**:
```typescript
// User tạo course từ template
// Sau đó sửa session title trong course
// → Template gốc có bị ảnh hưởng không?
```

**Khuyến nghị: DEEP CLONE (Copy toàn bộ data)**

```typescript
// ❌ KHÔNG NÊN: Copy by reference
const course = new Course();
course.sessionStructure = template.sessionStructure; // Reference!
// → Sửa course sẽ ảnh hưởng template

// ✅ NÊN: Deep clone
const course = new Course();
course.sessionStructure = JSON.parse(
  JSON.stringify(template.sessionStructure)
); // Deep copy

// Hoặc dùng library
import { cloneDeep } from 'lodash';
course.sessionStructure = cloneDeep(template.sessionStructure);
```

**Implementation**:
```typescript
@CommandHandler(CreateCourseFromTemplateCommand)
export class CreateCourseFromTemplateHandler {
  async execute(command: CreateCourseFromTemplateCommand) {
    const template = await this.templateRepository.findById(command.templateId);
    
    // Deep clone session structure
    const sessionStructure = JSON.parse(
      JSON.stringify(template.sessionStructure)
    );
    
    // Create course with cloned data
    const course = new Course();
    // ... populate course fields
    
    // Create actual sessions from structure
    for (const sessionTemplate of sessionStructure) {
      const session = new CourseSession();
      session.title = sessionTemplate.title; // Independent copy
      session.description = sessionTemplate.description;
      // ... create session
    }
    
    return course;
  }
}
```

#### 3. Template Marketplace Scope

**Vấn đề**: Template Marketplace (public sharing, rating) tốn nhiều thời gian

**Features cần implement cho Marketplace**:
- [ ] Public/Private visibility
- [ ] Rating system (1-5 stars)
- [ ] Review system (text reviews)
- [ ] Template categories & tags
- [ ] Search & filter
- [ ] Featured templates
- [ ] Usage statistics
- [ ] Moderation system

**Khuyến nghị**:
```
V2.0 (Must Have):
  ✅ Private templates only
  ✅ Basic template creation
  ✅ Apply template to course
  ✅ My templates list

V2.1 (Marketplace):
  🔵 Public sharing
  🔵 Rating & reviews
  🔵 Featured templates
  🔵 Advanced search
```

**Timeline impact**:
- Bỏ Marketplace khỏi V2.0 → Giảm **3-4 ngày** development time
- Focus vào core template functionality trước

---

## 💻 IMPLEMENTATION GUIDE

### Day 1: Entities & DTOs

#### Step 1: Create Entities

```typescript
// domain/entities/course-template.entity.ts
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
import { TemplateRating } from './template-rating.entity';

export interface SessionStructure {
  sessionNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  topics: string[];
  lessonCount: number;
}

export interface LessonStructure {
  sessionNumber: number;
  lessons: {
    lessonNumber: number;
    title: string;
    description: string;
    durationMinutes: number;
    type: 'lecture' | 'interactive' | 'practice' | 'assessment';
  }[];
}

export interface MaterialStructure {
  sessionNumber: number;
  lessonNumber: number;
  materials: {
    title: string;
    type: string;
    description: string;
  }[];
}

@Entity('course_templates')
@Index(['category'])
@Index(['level'])
@Index(['isPublic'])
@Index(['isFeatured'])
@Index(['usageCount'])
@Index(['rating'])
export class CourseTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  // Ownership
  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  // Categorization
  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 50, nullable: true })
  level: string;

  @Column({ length: 50, nullable: true })
  language: string;

  // Structure Metadata
  @Column({ name: 'total_sessions' })
  totalSessions: number;

  @Column({ name: 'sessions_per_week', nullable: true })
  sessionsPerWeek: number;

  @Column({ name: 'total_duration_hours', nullable: true })
  totalDurationHours: number;

  // Template Data
  @Column({ name: 'session_structure', type: 'json' })
  sessionStructure: SessionStructure[];

  @Column({ name: 'lesson_structure', type: 'json', nullable: true })
  lessonStructure: LessonStructure[];

  @Column({ name: 'default_materials', type: 'json', nullable: true })
  defaultMaterials: MaterialStructure[];

  // Pricing Suggestions
  @Column({
    name: 'suggested_price_full',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  suggestedPriceFull: number;

  @Column({
    name: 'suggested_price_session',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  suggestedPriceSession: number;

  // Usage Statistics
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ name: 'total_ratings', default: 0 })
  totalRatings: number;

  // Metadata
  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'thumbnail_url', length: 500, nullable: true })
  thumbnailUrl: string;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => TemplateRating, (rating) => rating.template)
  ratings: TemplateRating[];
}
```

```typescript
// domain/entities/template-rating.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { CourseTemplate } from './course-template.entity';
import { User } from '../../../users/user.entity';

@Entity('template_ratings')
@Unique(['templateId', 'userId'])
@Index(['templateId'])
@Index(['rating'])
export class TemplateRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column('text', { nullable: true })
  review: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CourseTemplate, (template) => template.ratings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: CourseTemplate;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

#### Step 2: Create DTOs

```typescript
// application/commands/create-template/create-template.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class SessionStructureDto {
  @IsNumber()
  sessionNumber: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(30)
  @Max(480)
  durationMinutes: number;

  @IsArray()
  @IsString({ each: true })
  topics: string[];

  @IsNumber()
  @Min(1)
  lessonCount: number;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsNumber()
  @IsOptional()
  sessionsPerWeek?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStructureDto)
  sessionStructure: SessionStructureDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  suggestedPriceFull?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  suggestedPriceSession?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
```

### Day 2: Commands & Handlers

```typescript
// application/commands/create-template/create-template.command.ts
import { SessionStructure } from '../../../domain/entities/course-template.entity';

export class CreateTemplateCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly isPublic: boolean,
    public readonly category: string,
    public readonly level: string,
    public readonly language: string,
    public readonly sessionStructure: SessionStructure[],
    public readonly sessionsPerWeek: number,
    public readonly suggestedPriceFull: number,
    public readonly suggestedPriceSession: number,
    public readonly tags: string[],
  ) {}
}
```

```typescript
// application/commands/create-template/create-template.handler.ts
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTemplateCommand } from './create-template.command';
import { CourseTemplate } from '../../../domain/entities/course-template.entity';
import { ITemplateRepository } from '../../../domain/repositories/template.repository.interface';

@CommandHandler(CreateTemplateCommand)
export class CreateTemplateHandler implements ICommandHandler<CreateTemplateCommand> {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(command: CreateTemplateCommand): Promise<CourseTemplate> {
    // Calculate metadata
    const totalSessions = command.sessionStructure.length;
    const totalDurationHours = command.sessionStructure.reduce(
      (sum, session) => sum + session.durationMinutes / 60,
      0
    );

    // Create template
    const template = new CourseTemplate();
    template.name = command.name;
    template.description = command.description;
    template.createdBy = command.userId;
    template.isPublic = command.isPublic;
    template.category = command.category;
    template.level = command.level;
    template.language = command.language;
    template.totalSessions = totalSessions;
    template.sessionsPerWeek = command.sessionsPerWeek;
    template.totalDurationHours = Math.round(totalDurationHours);
    template.sessionStructure = command.sessionStructure;
    template.suggestedPriceFull = command.suggestedPriceFull;
    template.suggestedPriceSession = command.suggestedPriceSession;
    template.tags = command.tags;

    return this.templateRepository.save(template);
  }
}
```

```typescript
// application/commands/create-from-template/create-from-template.command.ts
export class CreateCourseFromTemplateCommand {
  constructor(
    public readonly userId: string,
    public readonly templateId: string,
    public readonly courseData: {
      title: string;
      description?: string;
      startDate: Date;
      priceFullCourse?: number;
      pricePerSession?: number;
      maxStudents?: number;
    },
  ) {}
}
```

```typescript
// application/commands/create-from-template/create-from-template.handler.ts
import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { CreateCourseFromTemplateCommand } from './create-from-template.command';
import { Course } from '../../../domain/entities/course.entity';
import { ITemplateRepository } from '../../../domain/repositories/template.repository.interface';
import { CreateCourseCommand } from '../create-course/create-course.command';
import { AddSessionCommand } from '../add-session/add-session.command';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(CreateCourseFromTemplateCommand)
export class CreateCourseFromTemplateHandler
  implements ICommandHandler<CreateCourseFromTemplateCommand>
{
  constructor(
    private readonly templateRepository: ITemplateRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: CreateCourseFromTemplateCommand): Promise<Course> {
    // 1. Get template
    const template = await this.templateRepository.findById(command.templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 2. Create course
    const createCourseCommand = new CreateCourseCommand(
      command.userId,
      command.courseData.title,
      command.courseData.description || template.description,
      template.category,
      template.level,
      template.language,
      {
        fullCourse: command.courseData.priceFullCourse || template.suggestedPriceFull,
        perSession: command.courseData.pricePerSession || template.suggestedPriceSession,
      },
      {
        maxStudents: command.courseData.maxStudents || 30,
      },
      template.totalDurationHours,
    );

    const course = await this.commandBus.execute(createCourseCommand);

    // 3. Create sessions from template
    const startDate = new Date(command.courseData.startDate);
    
    for (const sessionTemplate of template.sessionStructure) {
      // Calculate session date
      const sessionDate = new Date(startDate);
      const weeksToAdd = Math.floor((sessionTemplate.sessionNumber - 1) / (template.sessionsPerWeek || 2));
      const daysToAdd = ((sessionTemplate.sessionNumber - 1) % (template.sessionsPerWeek || 2)) * 3; // 3 days apart
      sessionDate.setDate(sessionDate.getDate() + (weeksToAdd * 7) + daysToAdd);

      // Create session
      const addSessionCommand = new AddSessionCommand(
        command.userId,
        course.id,
        sessionTemplate.sessionNumber,
        sessionTemplate.title,
        sessionTemplate.description,
        sessionDate,
        '14:00', // Default start time
        this.calculateEndTime('14:00', sessionTemplate.durationMinutes),
      );

      await this.commandBus.execute(addSessionCommand);
    }

    // 4. Increment template usage count
    await this.templateRepository.incrementUsageCount(template.id);

    // 5. Track usage
    await this.templateRepository.trackUsage(template.id, course.id, command.userId);

    return course;
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }
}
```

### Day 3: Queries & Repository

```typescript
// application/queries/get-templates/get-templates.query.ts
export class GetTemplatesQuery {
  constructor(
    public readonly filters: {
      category?: string;
      level?: string;
      language?: string;
      isPublic?: boolean;
      isFeatured?: boolean;
      createdBy?: string;
      tags?: string[];
    },
    public readonly pagination: {
      page: number;
      limit: number;
    },
    public readonly sorting: {
      field: 'usageCount' | 'rating' | 'createdAt';
      order: 'ASC' | 'DESC';
    },
  ) {}
}
```

```typescript
// application/queries/get-templates/get-templates.handler.ts
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetTemplatesQuery } from './get-templates.query';
import { ITemplateRepository } from '../../../domain/repositories/template.repository.interface';
import { CourseTemplate } from '../../../domain/entities/course-template.entity';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetTemplatesQuery)
export class GetTemplatesHandler implements IQueryHandler<GetTemplatesQuery> {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(query: GetTemplatesQuery): Promise<PaginatedResult<CourseTemplate>> {
    const { data, total } = await this.templateRepository.findAll(
      query.filters,
      query.pagination,
      query.sorting,
    );

    return {
      data,
      total,
      page: query.pagination.page,
      limit: query.pagination.limit,
      totalPages: Math.ceil(total / query.pagination.limit),
    };
  }
}
```

```typescript
// infrastructure/repositories/typeorm-template.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseTemplate } from '../../domain/entities/course-template.entity';
import { ITemplateRepository } from '../../domain/repositories/template.repository.interface';

@Injectable()
export class TypeOrmTemplateRepository implements ITemplateRepository {
  constructor(
    @InjectRepository(CourseTemplate)
    private readonly repository: Repository<CourseTemplate>,
  ) {}

  async save(template: CourseTemplate): Promise<CourseTemplate> {
    return this.repository.save(template);
  }

  async findById(id: string): Promise<CourseTemplate | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['creator', 'ratings'],
    });
  }

  async findAll(
    filters: any,
    pagination: { page: number; limit: number },
    sorting: { field: string; order: 'ASC' | 'DESC' },
  ): Promise<{ data: CourseTemplate[]; total: number }> {
    const query = this.repository.createQueryBuilder('template');

    // Apply filters
    if (filters.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }
    if (filters.level) {
      query.andWhere('template.level = :level', { level: filters.level });
    }
    if (filters.isPublic !== undefined) {
      query.andWhere('template.isPublic = :isPublic', { isPublic: filters.isPublic });
    }
    if (filters.isFeatured !== undefined) {
      query.andWhere('template.isFeatured = :isFeatured', { isFeatured: filters.isFeatured });
    }
    if (filters.tags && filters.tags.length > 0) {
      query.andWhere('JSON_CONTAINS(template.tags, :tags)', {
        tags: JSON.stringify(filters.tags),
      });
    }

    // Sorting
    query.orderBy(`template.${sorting.field}`, sorting.order);

    // Pagination
    const skip = (pagination.page - 1) * pagination.limit;
    query.skip(skip).take(pagination.limit);

    // Execute
    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async incrementUsageCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'usageCount', 1);
  }

  async trackUsage(templateId: string, courseId: string, userId: string): Promise<void> {
    // Implementation depends on your tracking table
    // This is a placeholder
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    const template = await this.findById(id);
    if (!template) return;

    const totalRatings = template.totalRatings + 1;
    const currentTotal = (template.rating || 0) * template.totalRatings;
    const newAverage = (currentTotal + newRating) / totalRatings;

    await this.repository.update(id, {
      rating: Math.round(newAverage * 100) / 100,
      totalRatings,
    });
  }
}
```

### Day 4-5: API & Frontend

#### API Endpoints

```typescript
// presentation/controllers/course-templates.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../../auth/decorators/get-user.decorator';
import { User } from '../../../../users/user.entity';

@Controller('api/course-templates')
@UseGuards(JwtAuthGuard)
export class CourseTemplatesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles('teacher', 'admin')
  async createTemplate(@Body() dto: CreateTemplateDto, @GetUser() user: User) {
    const command = new CreateTemplateCommand(
      user.id,
      dto.name,
      dto.description,
      dto.isPublic,
      dto.category,
      dto.level,
      dto.language,
      dto.sessionStructure,
      dto.sessionsPerWeek,
      dto.suggestedPriceFull,
      dto.suggestedPriceSession,
      dto.tags,
    );

    const template = await this.commandBus.execute(command);

    return {
      message: 'Template created successfully',
      data: template,
    };
  }

  @Get()
  async getTemplates(@Query() dto: GetTemplatesDto) {
    const query = new GetTemplatesQuery(
      {
        category: dto.category,
        level: dto.level,
        language: dto.language,
        isPublic: dto.isPublic,
        isFeatured: dto.isFeatured,
        tags: dto.tags,
      },
      {
        page: dto.page,
        limit: dto.limit,
      },
      {
        field: dto.sortBy as any,
        order: dto.sortOrder,
      },
    );

    return this.queryBus.execute(query);
  }

  @Get(':id')
  async getTemplateById(@Param('id') id: string) {
    const query = new GetTemplateByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Post(':id/use')
  @Roles('teacher', 'admin')
  async createCourseFromTemplate(
    @Param('id') templateId: string,
    @Body() dto: CreateFromTemplateDto,
    @GetUser() user: User,
  ) {
    const command = new CreateCourseFromTemplateCommand(user.id, templateId, {
      title: dto.title,
      description: dto.description,
      startDate: new Date(dto.startDate),
      priceFullCourse: dto.priceFullCourse,
      pricePerSession: dto.pricePerSession,
      maxStudents: dto.maxStudents,
    });

    const course = await this.commandBus.execute(command);

    return {
      message: 'Course created from template successfully',
      data: course,
    };
  }

  @Post(':id/rate')
  async rateTemplate(
    @Param('id') templateId: string,
    @Body() dto: RateTemplateDto,
    @GetUser() user: User,
  ) {
    const command = new RateTemplateCommand(user.id, templateId, dto.rating, dto.review);
    await this.commandBus.execute(command);

    return {
      message: 'Rating submitted successfully',
    };
  }
}
```

---

## 🧪 TESTING

### Unit Tests

```typescript
describe('CreateTemplateHandler', () => {
  it('should create template with correct metadata', async () => {
    const command = new CreateTemplateCommand(
      'user-123',
      'English Conversation Template',
      'Template for conversation courses',
      true,
      'Language',
      'beginner',
      'English',
      [
        {
          sessionNumber: 1,
          title: 'Introduction',
          description: 'Getting started',
          durationMinutes: 120,
          topics: ['Greetings', 'Introductions'],
          lessonCount: 3,
        },
        {
          sessionNumber: 2,
          title: 'Daily Conversations',
          description: 'Common scenarios',
          durationMinutes: 120,
          topics: ['Shopping', 'Dining'],
          lessonCount: 4,
        },
      ],
      2,
      100,
      15,
      ['english', 'conversation', 'beginner'],
    );

    const result = await handler.execute(command);

    expect(result.totalSessions).toBe(2);
    expect(result.totalDurationHours).toBe(4); // 240 minutes = 4 hours
    expect(result.sessionStructure).toHaveLength(2);
  });
});
```

---

## ✅ CHECKLIST

### Day 1: Database & Entities
- [ ] Create migration for course_templates table
- [ ] Create migration for template_ratings table
- [ ] Create migration for template_usage table
- [ ] Create CourseTemplate entity
- [ ] Create TemplateRating entity
- [ ] Create DTOs
- [ ] Run migrations
- [ ] Verify tables created

### Day 2: Commands
- [ ] CreateTemplateCommand
- [ ] CreateCourseFromTemplateCommand
- [ ] RateTemplateCommand
- [ ] UpdateTemplateCommand
- [ ] DeleteTemplateCommand
- [ ] Write unit tests

### Day 3: Queries & Repository
- [ ] GetTemplatesQuery
- [ ] GetTemplateByIdQuery
- [ ] GetMyTemplatesQuery
- [ ] Implement repository
- [ ] Write unit tests

### Day 4: API & Integration
- [ ] Create controller
- [ ] Add validation
- [ ] Integration tests
- [ ] API documentation

### Day 5: Frontend & Testing
- [ ] Template browser UI
- [ ] Template creation form
- [ ] Use template flow
- [ ] E2E tests
- [ ] User acceptance testing

---

**Status**: 📋 Ready to Implement  
**Next Phase**: [PHASE3_BULK_OPERATIONS.md](./PHASE3_BULK_OPERATIONS.md)
