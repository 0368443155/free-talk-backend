# 🏗️ PHASE 1: CQRS Architecture Refactoring

**Timeline**: 5 ngày  
**Priority**: 🔥 Critical  
**Dependencies**: None  
**Status**: 📋 Ready to Start

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc CQRS](#kiến-trúc-cqrs)
3. [Implementation Guide](#implementation-guide)
4. [Migration Strategy](#migration-strategy)
5. [Testing Strategy](#testing-strategy)
6. [Checklist](#checklist)

---

## 🎯 TỔNG QUAN

### Mục Tiêu

**Refactor monolithic `CoursesService` (1,056 lines) sang Clean Architecture với CQRS pattern**

### Lợi Ích

```
✅ Separation of Concerns
   ├── Commands (Write) tách biệt Queries (Read)
   ├── Dễ test hơn
   └── Dễ maintain hơn

✅ Scalability
   ├── Read/Write có thể scale độc lập
   ├── Caching chỉ cho Read operations
   └── Optimize queries riêng biệt

✅ Performance
   ├── Query optimization không ảnh hưởng Commands
   ├── Caching strategies linh hoạt
   └── Database read replicas (future)

✅ Code Quality
   ├── Single Responsibility Principle
   ├── Smaller, focused files
   └── Better code organization
```

### Before vs After

```typescript
// ❌ BEFORE: Monolithic Service
@Injectable()
export class CoursesService {
  // 1,056 lines
  createCourse() { /* 64 lines */ }
  getCourses() { /* 82 lines */ }
  updateCourse() { /* 26 lines */ }
  deleteCourse() { /* 15 lines */ }
  addSession() { /* 52 lines */ }
  getCourseSessions() { /* 10 lines */ }
  // ... 25+ more methods
}

// ✅ AFTER: CQRS Pattern
src/features/courses/
├── application/
│   ├── commands/
│   │   ├── create-course/
│   │   │   ├── create-course.command.ts (15 lines)
│   │   │   ├── create-course.handler.ts (45 lines)
│   │   │   └── create-course.dto.ts (20 lines)
│   │   ├── update-course/ (similar structure)
│   │   └── delete-course/ (similar structure)
│   │
│   └── queries/
│       ├── get-courses/
│       │   ├── get-courses.query.ts (20 lines)
│       │   ├── get-courses.handler.ts (60 lines)
│       │   └── get-courses.dto.ts (25 lines)
│       └── get-course-by-id/ (similar structure)
```

### ⚠️ Cảnh Báo Kỹ Thuật & Best Practices

> **Cập nhật**: 2025-12-03  
> **Nguồn**: Engineering Manager Review

#### 1. Over-engineering Risk

**Vấn đề**: CQRS có thể tạo ra quá nhiều boilerplate code

**Khi NÊN dùng CQRS**:
- ✅ Business logic phức tạp
- ✅ Read/Write patterns khác nhau rõ rệt
- ✅ Cần scale Read và Write độc lập
- ✅ Cần caching strategies khác nhau

**Khi KHÔNG NÊN dùng CQRS**:
- ❌ Simple CRUD operations (ví dụ: `GetCourseById`)
- ❌ Prototype/MVP projects
- ❌ Team chưa quen với pattern

**Khuyến nghị**:
```typescript
// ❌ KHÔNG CẦN CQRS cho simple queries
// Thay vì tạo: GetCourseByIdQuery + Handler + DTO
// Chỉ cần:
@Get(':id')
async getCourseById(@Param('id') id: string) {
  return this.courseRepository.findById(id);
}

// ✅ CẦN CQRS cho complex operations
// CreateCourseWithSessionsCommand + Handler
// - Validate business rules
// - Create course
// - Create sessions
// - Send notifications
// - Publish events
```

#### 2. Data Consistency & Caching

**Vấn đề**: Race conditions khi invalidate cache

**Scenario**:
```typescript
// User A: Update course title
UpdateCourseCommand → Save to DB → Invalidate cache

// User B: Get course (đồng thời)
GetCourseQuery → Check cache → Cache miss → Query DB

// Race condition: User B có thể lấy old data nếu cache invalidation chưa xong
```

**Giải pháp**:
```typescript
// Option 1: Cache-Aside Pattern với TTL ngắn
@QueryHandler(GetCourseQuery)
export class GetCourseHandler {
  async execute(query: GetCourseQuery) {
    const cacheKey = `course:${query.id}`;
    
    // Try cache first
    let course = await this.cache.get(cacheKey);
    
    if (!course) {
      // Cache miss: query DB
      course = await this.repository.findById(query.id);
      
      // Set cache với TTL ngắn (30s - 5 phút)
      await this.cache.set(cacheKey, course, 300);
    }
    
    return course;
  }
}

// Option 2: Write-Through Cache
@CommandHandler(UpdateCourseCommand)
export class UpdateCourseHandler {
  async execute(command: UpdateCourseCommand) {
    // 1. Update DB
    const course = await this.repository.update(command.id, command.data);
    
    // 2. Update cache immediately (không chỉ invalidate)
    await this.cache.set(`course:${command.id}`, course, 300);
    
    // 3. Publish event
    this.eventBus.publish(new CourseUpdatedEvent(course));
    
    return course;
  }
}
```

#### 3. Migration Strategy

**Vấn đề**: Chạy song song old service và new CQRS handlers

**Khuyến nghị**:
```typescript
// Phase 1: Dual Write (Write to both old and new)
@Injectable()
export class CoursesService {
  constructor(
    private commandBus: CommandBus,
    private oldRepository: OldCourseRepository,
  ) {}

  async createCourse(dto: CreateCourseDto) {
    // 1. Write to old system (fallback)
    const oldCourse = await this.oldRepository.save(dto);
    
    try {
      // 2. Write to new CQRS system
      const command = new CreateCourseCommand(/* ... */);
      await this.commandBus.execute(command);
    } catch (error) {
      // Log error but don't fail
      this.logger.error('CQRS write failed', error);
    }
    
    return oldCourse;
  }
}

// Phase 2: Switch primary (Read from new, fallback to old)
// Phase 3: Remove old system
```

#### 4. Testing Complexity

**Vấn đề**: Nhiều files → Nhiều tests cần viết

**Khuyến nghị**:
```typescript
// Test Command Handler riêng biệt
describe('CreateCourseHandler', () => {
  it('should create course and publish event', async () => {
    // Arrange
    const command = new CreateCourseCommand(/* ... */);
    const mockRepository = { save: jest.fn() };
    const mockEventBus = { publish: jest.fn() };
    
    const handler = new CreateCourseHandler(
      mockRepository,
      mockEventBus,
    );
    
    // Act
    await handler.execute(command);
    
    // Assert
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CourseCreated' })
    );
  });
});

// Integration test cho toàn bộ flow
describe('Course Creation Flow', () => {
  it('should create course via API', async () => {
    const response = await request(app)
      .post('/api/courses')
      .send({ title: 'Test Course' });
      
    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Test Course');
  });
});
```

#### 5. Timeline Adjustment

**Thực tế**: 5 ngày cho Phase 1 là **RỦI RO CAO**

**Khuyến nghị timeline**:
```
Day 1-3: Setup CQRS Architecture (3 ngày thay vì 2)
  ├── Folder structure
  ├── Base classes
  ├── First Command (CreateCourse)
  └── First Query (GetCourses)

Day 4-6: Migrate Core Operations (3 ngày thay vì 1)
  ├── Update, Delete Commands
  ├── GetById, Search Queries
  └── Repository pattern

Day 7-8: Session & Lesson Commands (2 ngày)
  ├── AddSession, UpdateSession
  └── AddLesson, UpdateLesson

Day 9-10: Testing & Documentation (2 ngày)
  ├── Unit tests (>80% coverage)
  ├── Integration tests
  └── Migration guide

TỔNG: 10 NGÀY (thay vì 5 ngày)
```

---

## 🏛️ KIẾN TRÚC CQRS

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│         PRESENTATION LAYER                   │
│  ┌──────────────┐    ┌──────────────┐       │
│  │ Controllers  │───▶│     DTOs     │       │
│  └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────┘
              │                │
              ▼                ▼
┌─────────────────────────────────────────────┐
│        APPLICATION LAYER                     │
│  ┌──────────────┐    ┌──────────────┐       │
│  │   COMMANDS   │    │   QUERIES    │       │
│  │              │    │              │       │
│  │ - Create     │    │ - GetAll     │       │
│  │ - Update     │    │ - GetById    │       │
│  │ - Delete     │    │ - Search     │       │
│  └──────┬───────┘    └──────┬───────┘       │
│         │                   │                │
│         ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐       │
│  │   HANDLERS   │    │   HANDLERS   │       │
│  └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────┘
              │                │
              ▼                ▼
┌─────────────────────────────────────────────┐
│           DOMAIN LAYER                       │
│  ┌──────────────┐    ┌──────────────┐       │
│  │   Entities   │    │   Services   │       │
│  └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────┘
              │                │
              ▼                ▼
┌─────────────────────────────────────────────┐
│      INFRASTRUCTURE LAYER                    │
│  ┌──────────────┐    ┌──────────────┐       │
│  │ Repositories │    │    Cache     │       │
│  └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────┘
```

### CQRS Flow

```
WRITE OPERATION (Command):
┌──────┐    ┌────────────┐    ┌─────────┐    ┌────────┐
│Client│───▶│ Controller │───▶│ Command │───▶│Handler │
└──────┘    └────────────┘    └─────────┘    └────┬───┘
                                                   │
                                                   ▼
                                            ┌──────────┐
                                            │Validation│
                                            └────┬─────┘
                                                 │
                                                 ▼
                                            ┌──────────┐
                                            │  Domain  │
                                            │  Logic   │
                                            └────┬─────┘
                                                 │
                                                 ▼
                                            ┌──────────┐
                                            │   Save   │
                                            └────┬─────┘
                                                 │
                                                 ▼
                                            ┌──────────┐
                                            │  Event   │
                                            │  Publish │
                                            └──────────┘

READ OPERATION (Query):
┌──────┐    ┌────────────┐    ┌───────┐    ┌────────┐
│Client│───▶│ Controller │───▶│ Query │───▶│Handler │
└──────┘    └────────────┘    └───────┘    └────┬───┘
                                                 │
                                                 ▼
                                            ┌──────────┐
                                            │  Cache?  │
                                            └────┬─────┘
                                                 │
                                        ┌────────┴────────┐
                                        │                 │
                                      YES                NO
                                        │                 │
                                        ▼                 ▼
                                   ┌────────┐      ┌──────────┐
                                   │ Return │      │   Query  │
                                   │ Cached │      │    DB    │
                                   └────────┘      └────┬─────┘
                                                        │
                                                        ▼
                                                   ┌──────────┐
                                                   │   Cache  │
                                                   │  Result  │
                                                   └────┬─────┘
                                                        │
                                                        ▼
                                                   ┌──────────┐
                                                   │  Return  │
                                                   └──────────┘
```

---

## 💻 IMPLEMENTATION GUIDE

### Day 1-2: Setup Structure & Commands

#### Step 1: Create Folder Structure

```bash
cd talkplatform-backend/src/features/courses

# Create application layer
mkdir -p application/commands
mkdir -p application/queries
mkdir -p application/services

# Create domain layer
mkdir -p domain/value-objects
mkdir -p domain/services
mkdir -p domain/repositories

# Create infrastructure layer
mkdir -p infrastructure/repositories
mkdir -p infrastructure/caching
```

#### Step 2: Install Dependencies

```bash
npm install @nestjs/cqrs
npm install class-validator class-transformer
```

#### Step 3: Create Base Command

```typescript
// application/commands/base.command.ts
export abstract class BaseCommand {
  constructor(public readonly userId: string) {}
}
```

#### Step 4: Implement CreateCourse Command

```typescript
// application/commands/create-course/create-course.command.ts
import { BaseCommand } from '../base.command';

export class CreateCourseCommand extends BaseCommand {
  constructor(
    userId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly category: string,
    public readonly level: string,
    public readonly language: string,
    public readonly pricing: {
      fullCourse?: number;
      perSession?: number;
    },
    public readonly capacity: {
      maxStudents: number;
    },
    public readonly durationHours?: number,
  ) {
    super(userId);
  }
}
```

```typescript
// application/commands/create-course/create-course.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PricingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  fullCourse?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perSession?: number;
}

class CapacityDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  maxStudents: number;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @ValidateNested()
  @Type(() => PricingDto)
  @IsOptional()
  pricing?: PricingDto;

  @ValidateNested()
  @Type(() => CapacityDto)
  capacity: CapacityDto;

  @IsNumber()
  @IsOptional()
  @Min(1)
  durationHours?: number;
}
```

```typescript
// application/commands/create-course/create-course.handler.ts
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CreateCourseCommand } from './create-course.command';
import { Course } from '../../../domain/entities/course.entity';
import { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import { CourseValidationService } from '../../services/course-validation.service';
import { CourseCreatedEvent } from '../../../domain/events/course-created.event';
import { BadRequestException } from '@nestjs/common';

@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly validationService: CourseValidationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateCourseCommand): Promise<Course> {
    // 1. Validate business rules
    await this.validateCommand(command);

    // 2. Create course entity
    const course = this.createCourseEntity(command);

    // 3. Save to database
    const savedCourse = await this.courseRepository.save(course);

    // 4. Publish domain event
    this.eventBus.publish(new CourseCreatedEvent(savedCourse.id, command.userId));

    return savedCourse;
  }

  private async validateCommand(command: CreateCourseCommand): Promise<void> {
    // Check title uniqueness
    const exists = await this.courseRepository.existsByTitleAndTeacher(
      command.title,
      command.userId
    );

    if (exists) {
      throw new BadRequestException('Course with this title already exists');
    }

    // Validate pricing
    if (command.pricing?.fullCourse && command.pricing?.perSession) {
      this.validationService.validatePricing(
        command.pricing.fullCourse,
        command.pricing.perSession
      );
    }
  }

  private createCourseEntity(command: CreateCourseCommand): Course {
    const course = new Course();
    course.teacherId = command.userId;
    course.title = command.title;
    course.description = command.description;
    course.category = command.category;
    course.level = command.level;
    course.language = command.language;
    course.priceFullCourse = command.pricing?.fullCourse;
    course.pricePerSession = command.pricing?.perSession;
    course.maxStudents = command.capacity.maxStudents;
    course.durationHours = command.durationHours;
    course.status = 'draft';
    course.isPublished = false;
    course.currentStudents = 0;
    course.totalSessions = 0;

    return course;
  }
}
```

#### Step 5: Create Repository Interface

```typescript
// domain/repositories/course.repository.interface.ts
import { Course } from '../entities/course.entity';

export interface ICourseRepository {
  save(course: Course): Promise<Course>;
  findById(id: string): Promise<Course | null>;
  findByTitleAndTeacher(title: string, teacherId: string): Promise<Course | null>;
  existsByTitleAndTeacher(title: string, teacherId: string): Promise<boolean>;
  update(id: string, data: Partial<Course>): Promise<Course>;
  delete(id: string): Promise<void>;
  findAll(filters: any, pagination: any): Promise<{ data: Course[]; total: number }>;
}
```

#### Step 6: Implement TypeORM Repository

```typescript
// infrastructure/repositories/typeorm-course.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../domain/entities/course.entity';
import { ICourseRepository } from '../../domain/repositories/course.repository.interface';

@Injectable()
export class TypeOrmCourseRepository implements ICourseRepository {
  constructor(
    @InjectRepository(Course)
    private readonly repository: Repository<Course>,
  ) {}

  async save(course: Course): Promise<Course> {
    return this.repository.save(course);
  }

  async findById(id: string): Promise<Course | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['sessions', 'teacher'],
    });
  }

  async findByTitleAndTeacher(title: string, teacherId: string): Promise<Course | null> {
    return this.repository.findOne({
      where: { title, teacherId },
    });
  }

  async existsByTitleAndTeacher(title: string, teacherId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { title, teacherId },
    });
    return count > 0;
  }

  async update(id: string, data: Partial<Course>): Promise<Course> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAll(
    filters: any,
    pagination: { page: number; limit: number }
  ): Promise<{ data: Course[]; total: number }> {
    const query = this.repository.createQueryBuilder('course');

    // Apply filters
    if (filters.category) {
      query.andWhere('course.category = :category', { category: filters.category });
    }
    if (filters.level) {
      query.andWhere('course.level = :level', { level: filters.level });
    }
    if (filters.isPublished !== undefined) {
      query.andWhere('course.isPublished = :isPublished', { isPublished: filters.isPublished });
    }

    // Pagination
    const skip = (pagination.page - 1) * pagination.limit;
    query.skip(skip).take(pagination.limit);

    // Execute
    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }
}
```

#### Step 7: Create Validation Service

```typescript
// application/services/course-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class CourseValidationService {
  validatePricing(fullCoursePrice: number, perSessionPrice: number): void {
    if (fullCoursePrice >= perSessionPrice) {
      throw new BadRequestException(
        'Full course price must be less than per-session price'
      );
    }
  }

  validateSchedule(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const now = new Date();
    if (startDate < now) {
      throw new BadRequestException('Start date must be in the future');
    }
  }

  validateCapacity(current: number, max: number): void {
    if (current > max) {
      throw new BadRequestException('Current students cannot exceed max capacity');
    }
  }
}
```

#### Step 8: Update Controller

```typescript
// presentation/controllers/courses.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateCourseDto } from '../../application/commands/create-course/create-course.dto';
import { CreateCourseCommand } from '../../application/commands/create-course/create-course.command';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../../auth/decorators/get-user.decorator';
import { User } from '../../../../users/user.entity';

@Controller('api/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Roles('teacher', 'admin')
  async createCourse(
    @Body() dto: CreateCourseDto,
    @GetUser() user: User,
  ) {
    const command = new CreateCourseCommand(
      user.id,
      dto.title,
      dto.description,
      dto.category,
      dto.level,
      dto.language,
      dto.pricing,
      dto.capacity,
      dto.durationHours,
    );

    const course = await this.commandBus.execute(command);

    return {
      message: 'Course created successfully',
      data: course,
    };
  }
}
```

#### Step 9: Register in Module

```typescript
// courses.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Course } from './domain/entities/course.entity';

// Controllers
import { CoursesController } from './presentation/controllers/courses.controller';

// Command Handlers
import { CreateCourseHandler } from './application/commands/create-course/create-course.handler';

// Repositories
import { TypeOrmCourseRepository } from './infrastructure/repositories/typeorm-course.repository';

// Services
import { CourseValidationService } from './application/services/course-validation.service';

const CommandHandlers = [CreateCourseHandler];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Course]),
  ],
  controllers: [CoursesController],
  providers: [
    ...CommandHandlers,
    CourseValidationService,
    {
      provide: 'ICourseRepository',
      useClass: TypeOrmCourseRepository,
    },
  ],
})
export class CoursesModule {}
```

### Day 3: Implement Queries

#### Step 1: Create GetCourses Query

```typescript
// application/queries/get-courses/get-courses.query.ts
export class GetCoursesQuery {
  constructor(
    public readonly filters: {
      category?: string;
      level?: string;
      language?: string;
      teacherId?: string;
      isPublished?: boolean;
      minPrice?: number;
      maxPrice?: number;
    },
    public readonly pagination: {
      page: number;
      limit: number;
    },
    public readonly sorting: {
      field: string;
      order: 'ASC' | 'DESC';
    },
  ) {}
}
```

```typescript
// application/queries/get-courses/get-courses.dto.ts
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetCoursesDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
```

```typescript
// application/queries/get-courses/get-courses.handler.ts
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetCoursesQuery } from './get-courses.query';
import { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import { CacheService } from '../../../infrastructure/caching/cache.service';
import { Course } from '../../../domain/entities/course.entity';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetCoursesQuery)
export class GetCoursesHandler implements IQueryHandler<GetCoursesQuery> {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetCoursesQuery): Promise<PaginatedResult<Course>> {
    // 1. Build cache key
    const cacheKey = this.buildCacheKey(query);

    // 2. Check cache
    const cached = await this.cacheService.get<PaginatedResult<Course>>(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. Query database
    const { data, total } = await this.courseRepository.findAll(
      query.filters,
      query.pagination,
    );

    // 4. Build result
    const result: PaginatedResult<Course> = {
      data,
      total,
      page: query.pagination.page,
      limit: query.pagination.limit,
      totalPages: Math.ceil(total / query.pagination.limit),
    };

    // 5. Cache result (5 minutes for published courses)
    if (query.filters.isPublished) {
      await this.cacheService.set(cacheKey, result, 300);
    }

    return result;
  }

  private buildCacheKey(query: GetCoursesQuery): string {
    return `courses:list:${JSON.stringify(query)}`;
  }
}
```

#### Step 2: Implement Cache Service

```typescript
// infrastructure/caching/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    // Implementation depends on cache store (Redis, etc.)
    // For Redis:
    // const keys = await this.cacheManager.store.keys(pattern);
    // await Promise.all(keys.map(key => this.cacheManager.del(key)));
  }

  async invalidateCourseCache(courseId?: string): Promise<void> {
    if (courseId) {
      await this.del(`course:${courseId}`);
    }
    await this.delPattern('courses:list:*');
  }
}
```

#### Step 3: Update Controller for Queries

```typescript
// presentation/controllers/courses.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetCoursesDto } from '../../application/queries/get-courses/get-courses.dto';
import { GetCoursesQuery } from '../../application/queries/get-courses/get-courses.query';

@Controller('api/courses')
export class CoursesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getCourses(@Query() dto: GetCoursesDto) {
    const query = new GetCoursesQuery(
      {
        category: dto.category,
        level: dto.level,
        language: dto.language,
        teacherId: dto.teacherId,
        isPublished: dto.isPublished,
        minPrice: dto.minPrice,
        maxPrice: dto.maxPrice,
      },
      {
        page: dto.page,
        limit: dto.limit,
      },
      {
        field: dto.sortBy,
        order: dto.sortOrder,
      },
    );

    return this.queryBus.execute(query);
  }
}
```

### Day 4-5: Complete All Commands & Queries

**Commands to Implement:**
- ✅ CreateCourseCommand
- UpdateCourseCommand
- DeleteCourseCommand
- PublishCourseCommand
- UnpublishCourseCommand
- AddSessionCommand
- UpdateSessionCommand
- DeleteSessionCommand
- AddLessonCommand
- UpdateLessonCommand
- DeleteLessonCommand

**Queries to Implement:**
- ✅ GetCoursesQuery
- GetCourseByIdQuery
- GetTeacherCoursesQuery
- GetCourseSessionsQuery
- GetSessionLessonsQuery
- SearchCoursesQuery

---

## 🔄 MIGRATION STRATEGY

### Parallel Running Approach

```typescript
// Feature flag configuration
export const FEATURE_FLAGS = {
  USE_CQRS_COURSES: process.env.USE_CQRS_COURSES === 'true',
};

// Adapter pattern for gradual migration
@Injectable()
export class CoursesServiceAdapter {
  constructor(
    private readonly oldService: CoursesService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createCourse(teacherId: string, dto: CreateCourseDto): Promise<Course> {
    if (FEATURE_FLAGS.USE_CQRS_COURSES) {
      const command = new CreateCourseCommand(/* ... */);
      return this.commandBus.execute(command);
    } else {
      return this.oldService.createCourse(teacherId, dto);
    }
  }

  async getCourses(query: GetCoursesQueryDto): Promise<any> {
    if (FEATURE_FLAGS.USE_CQRS_COURSES) {
      const queryObj = new GetCoursesQuery(/* ... */);
      return this.queryBus.execute(queryObj);
    } else {
      return this.oldService.getCourses(query);
    }
  }
}
```

### Migration Steps

1. **Week 1**: Implement CQRS alongside old code
2. **Week 2**: Test CQRS in development
3. **Week 3**: Enable for 10% of users
4. **Week 4**: Enable for 50% of users
5. **Week 5**: Enable for 100% of users
6. **Week 6**: Remove old code

---

## 🧪 TESTING STRATEGY

### Unit Tests

```typescript
// create-course.handler.spec.ts
describe('CreateCourseHandler', () => {
  let handler: CreateCourseHandler;
  let repository: ICourseRepository;
  let validationService: CourseValidationService;
  let eventBus: EventBus;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      existsByTitleAndTeacher: jest.fn(),
    } as any;

    validationService = {
      validatePricing: jest.fn(),
    } as any;

    eventBus = {
      publish: jest.fn(),
    } as any;

    handler = new CreateCourseHandler(repository, validationService, eventBus);
  });

  it('should create a course successfully', async () => {
    // Arrange
    const command = new CreateCourseCommand(
      'user-123',
      'Test Course',
      'Description',
      'Language',
      'beginner',
      'English',
      { fullCourse: 100, perSession: 15 },
      { maxStudents: 30 },
      20,
    );

    (repository.existsByTitleAndTeacher as jest.Mock).mockResolvedValue(false);
    (repository.save as jest.Mock).mockResolvedValue({ id: 'course-123', ...command });

    // Act
    const result = await handler.execute(command);

    // Assert
    expect(repository.existsByTitleAndTeacher).toHaveBeenCalledWith('Test Course', 'user-123');
    expect(validationService.validatePricing).toHaveBeenCalledWith(100, 15);
    expect(repository.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
    expect(result.id).toBe('course-123');
  });

  it('should throw error if title already exists', async () => {
    // Arrange
    const command = new CreateCourseCommand(/* ... */);
    (repository.existsByTitleAndTeacher as jest.Mock).mockResolvedValue(true);

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow('Course with this title already exists');
  });
});
```

### Integration Tests

```typescript
// courses.controller.integration.spec.ts
describe('CoursesController (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'teacher@test.com', password: 'password' });
    
    authToken = loginResponse.body.accessToken;
  });

  it('POST /api/courses - should create a course', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Integration Test Course',
        description: 'Test description',
        category: 'Language',
        level: 'beginner',
        capacity: { maxStudents: 30 },
      });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Integration Test Course');
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## ✅ CHECKLIST

### Day 1-2: Commands Setup
- [ ] Create folder structure
- [ ] Install @nestjs/cqrs
- [ ] Create CreateCourseCommand
- [ ] Create CreateCourseHandler
- [ ] Create CreateCourseDto
- [ ] Create ICourseRepository interface
- [ ] Implement TypeOrmCourseRepository
- [ ] Create CourseValidationService
- [ ] Update CoursesController
- [ ] Register in CoursesModule
- [ ] Write unit tests
- [ ] Test API endpoint

### Day 3: Queries Setup
- [ ] Create GetCoursesQuery
- [ ] Create GetCoursesHandler
- [ ] Create GetCoursesDto
- [ ] Implement CacheService
- [ ] Update repository with findAll
- [ ] Update controller
- [ ] Write unit tests
- [ ] Test caching

### Day 4: Complete Commands
- [ ] UpdateCourseCommand
- [ ] DeleteCourseCommand
- [ ] PublishCourseCommand
- [ ] AddSessionCommand
- [ ] AddLessonCommand
- [ ] Write tests for all

### Day 5: Complete Queries & Testing
- [ ] GetCourseByIdQuery
- [ ] GetTeacherCoursesQuery
- [ ] SearchCoursesQuery
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests
- [ ] Documentation

---

**Status**: 📋 Ready to Implement  
**Next Phase**: [PHASE2_COURSE_TEMPLATES.md](./PHASE2_COURSE_TEMPLATES.md)
