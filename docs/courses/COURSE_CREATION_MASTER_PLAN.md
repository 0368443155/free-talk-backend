# 🎓 KẾ HOẠCH TỔNG THỂ: HOÀN THIỆN CHỨC NĂNG TẠO KHÓA HỌC

**Dự án**: TalkConnect Platform  
**Module**: Course Creation System  
**Phiên bản**: 2.0  
**Ngày tạo**: 2025-12-02  
**Trạng thái**: 🚀 **READY TO IMPLEMENT**

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Phân Tích Hiện Trạng](#phân-tích-hiện-trạng)
3. [Mục Tiêu Cải Tiến](#mục-tiêu-cải-tiến)
4. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
5. [Lộ Trình Triển Khai](#lộ-trình-triển-khai)
6. [Chi Tiết Từng Phase](#chi-tiết-từng-phase)
7. [Đánh Giá Rủi Ro](#đánh-giá-rủi-ro)
8. [Tiêu Chí Thành Công](#tiêu-chí-thành-công)

---

## 🎯 TỔNG QUAN

### Bối Cảnh

Hệ thống quản lý khóa học hiện tại đã hoàn thành **Phase 1** với các chức năng cơ bản:
- ✅ Tạo khóa học (Course)
- ✅ Thêm buổi học (Session)
- ✅ Thêm bài học (Lesson)
- ✅ Quản lý tài liệu (Materials)
- ✅ Tích hợp LiveKit
- ✅ Tạo QR Code

### Vấn Đề Hiện Tại

```
⚠️ MONOLITHIC SERVICE
├── courses.service.ts (1,056 lines) ❌ QUÁ LỚN
├── courses.controller.ts (24,845 bytes) ⚠️ PHỨC TẠP
└── Thiếu tính năng nâng cao ❌
```

### Mục Tiêu Dự Án

**Nâng cấp hệ thống tạo khóa học lên chuẩn chuyên nghiệp, có khả năng mở rộng và dễ bảo trì.**

---

## 📊 PHÂN TÍCH HIỆN TRẠNG

### Điểm Mạnh ✅

1. **Database Schema Hoàn Chỉnh**
   ```
   ✅ courses (16 columns)
   ✅ course_sessions (15 columns)
   ✅ lessons (20 columns)
   ✅ lesson_materials (12 columns)
   ✅ course_enrollments (9 columns)
   ✅ session_purchases (8 columns)
   ```

2. **Business Logic Đầy Đủ**
   - Enrollment system
   - Payment hold mechanism
   - Access control
   - QR code generation
   - LiveKit integration

3. **API Endpoints Hoạt Động**
   - 20+ endpoints cho CRUD operations
   - Authentication & Authorization
   - Validation & Error handling

### Điểm Yếu ⚠️

1. **Kiến Trúc Monolithic**
   ```typescript
   // ❌ VẤN ĐỀ: Tất cả logic trong 1 service
   CoursesService {
     createCourse()           // 64 lines
     getCourses()             // 82 lines
     addSession()             // 52 lines
     addLesson()              // 142 lines
     createCourseWithSessions() // 230 lines ❌❌❌
     // ... 25+ methods khác
   }
   ```

2. **Thiếu Tính Năng Nâng Cao**
   - ❌ Course templates
   - ❌ Bulk operations
   - ❌ Draft auto-save
   - ❌ Version control
   - ❌ Course cloning
   - ❌ AI-assisted content generation
   - ❌ Rich text editor
   - ❌ Media upload optimization

3. **UX Chưa Tối Ưu**
   - ❌ Multi-step wizard
   - ❌ Progress tracking
   - ❌ Preview mode
   - ❌ Validation feedback
   - ❌ Undo/Redo functionality

4. **Performance Issues**
   - ⚠️ N+1 query problems
   - ⚠️ Large payload responses
   - ⚠️ No caching strategy
   - ⚠️ Slow file uploads

---

## 🎯 MỤC TIÊU CẢI TIẾN

### 1. Kiến Trúc (Architecture)

```
🎯 MỤC TIÊU: Refactor sang Clean Architecture + CQRS

BEFORE:                          AFTER:
┌─────────────────┐             ┌──────────────────────┐
│ CoursesService  │             │ Application Layer    │
│   (1056 lines)  │    ──────▶  │  ├── Commands        │
│                 │             │  ├── Queries         │
└─────────────────┘             │  └── Handlers        │
                                ├──────────────────────┤
                                │ Domain Layer         │
                                │  ├── Entities        │
                                │  ├── Value Objects   │
                                │  └── Domain Services │
                                ├──────────────────────┤
                                │ Infrastructure       │
                                │  ├── Repositories    │
                                │  └── External APIs   │
                                └──────────────────────┘
```

### 2. Tính Năng (Features)

#### A. Course Creation Wizard 🧙‍♂️
```
Step 1: Basic Information
  ├── Title, Description, Category
  ├── Level, Language
  └── Thumbnail upload

Step 2: Pricing & Capacity
  ├── Price models (full/per-session)
  ├── Max students
  └── Early bird discounts

Step 3: Sessions Planning
  ├── Add multiple sessions
  ├── Bulk import from CSV
  └── Schedule templates

Step 4: Lessons & Content
  ├── Add lessons to sessions
  ├── Upload materials
  └── Rich text content

Step 5: Review & Publish
  ├── Preview course
  ├── Validation checklist
  └── Publish or save as draft
```

#### B. Advanced Features 🚀

**1. Course Templates**
```typescript
// Giáo viên có thể tạo template từ khóa học hiện có
interface CourseTemplate {
  id: string;
  name: string;
  description: string;
  structure: {
    totalSessions: number;
    sessionsPerWeek: number;
    lessonDuration: number;
    sessionStructure: SessionTemplate[];
  };
  createdBy: string;
  isPublic: boolean;
}
```

**2. Bulk Operations**
```typescript
// Import sessions từ CSV/Excel
POST /api/courses/:id/sessions/bulk-import
Content-Type: multipart/form-data

// Export course structure
GET /api/courses/:id/export?format=csv|json|pdf
```

**3. Auto-Save & Version Control**
```typescript
// Tự động lưu draft mỗi 30 giây
interface CourseDraft {
  courseId: string;
  version: number;
  data: Partial<Course>;
  savedAt: Date;
  autoSaved: boolean;
}

// Khôi phục version cũ
POST /api/courses/:id/restore-version/:version
```

**4. Course Cloning**
```typescript
// Clone khóa học (bao gồm sessions, lessons, materials)
POST /api/courses/:id/clone
{
  "newTitle": "English Conversation - Winter 2025",
  "cloneContent": true,
  "cloneMaterials": true,
  "cloneSchedule": false // Tạo lịch mới
}
```

**5. AI-Assisted Content**
```typescript
// AI tạo mô tả khóa học
POST /api/courses/ai/generate-description
{
  "title": "English Conversation",
  "level": "beginner",
  "topics": ["greetings", "daily conversation"]
}

// AI đề xuất cấu trúc khóa học
POST /api/courses/ai/suggest-structure
{
  "duration": "20 hours",
  "level": "intermediate",
  "goal": "Business English"
}
```

#### C. UX Improvements 🎨

**1. Multi-Step Form với Progress**
```typescript
interface CourseCreationProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  validationErrors: Record<string, string[]>;
  canProceed: boolean;
}
```

**2. Real-time Validation**
```typescript
// Validate ngay khi user nhập
- Title uniqueness check (debounced)
- Price validation
- Schedule conflict detection
- File size/type validation
```

**3. Preview Mode**
```typescript
// Preview khóa học trước khi publish
GET /api/courses/:id/preview
// Returns: Student view của course
```

**4. Rich Text Editor**
```
- Markdown support
- Image embedding
- Video embedding
- Code syntax highlighting
- Tables, lists, formatting
```

### 3. Performance (Hiệu Năng)

```
🎯 MỤC TIÊU: Tối ưu hóa tốc độ và khả năng mở rộng

1. Database Optimization
   ├── Add indexes on frequently queried columns
   ├── Implement query result caching (Redis)
   ├── Use database views for complex queries
   └── Optimize N+1 queries with eager loading

2. API Optimization
   ├── Implement pagination for all list endpoints
   ├── Add field selection (?fields=id,title,price)
   ├── Compress responses (gzip)
   └── Rate limiting per user

3. File Upload Optimization
   ├── Direct upload to S3/CloudFlare R2
   ├── Image optimization (resize, compress)
   ├── Video transcoding
   └── Progress tracking for large files

4. Caching Strategy
   ├── Cache published courses (1 hour TTL)
   ├── Cache course listings (5 minutes TTL)
   ├── Invalidate cache on update
   └── Use Redis for distributed caching
```

### 4. Developer Experience (DX)

```
🎯 MỤC TIÊU: Code dễ đọc, dễ test, dễ maintain

1. Clean Code
   ├── Single Responsibility Principle
   ├── Dependency Injection
   ├── Interface-based design
   └── Comprehensive documentation

2. Testing
   ├── Unit tests (80% coverage)
   ├── Integration tests
   ├── E2E tests for critical flows
   └── Load testing

3. Documentation
   ├── OpenAPI/Swagger specs
   ├── Code comments
   ├── Architecture diagrams
   └── Developer guides
```

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ REST API     │  │ GraphQL API  │  │ WebSocket    │  │
│  │ Controllers  │  │ (Optional)   │  │ Gateway      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │              CQRS Pattern                          │ │
│  │  ┌──────────────┐         ┌──────────────┐        │ │
│  │  │   COMMANDS   │         │   QUERIES    │        │ │
│  │  ├──────────────┤         ├──────────────┤        │ │
│  │  │ CreateCourse │         │ GetCourses   │        │ │
│  │  │ UpdateCourse │         │ GetCourseById│        │ │
│  │  │ AddSession   │         │ SearchCourses│        │ │
│  │  │ AddLesson    │         │ GetStatistics│        │ │
│  │  └──────────────┘         └──────────────┘        │ │
│  │         ↓                         ↓                │ │
│  │  ┌──────────────┐         ┌──────────────┐        │ │
│  │  │   HANDLERS   │         │   HANDLERS   │        │ │
│  │  └──────────────┘         └──────────────┘        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Entities   │  │ Value Objects│  │   Services   │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ Course       │  │ Money        │  │ PricingServ  │  │
│  │ Session      │  │ Schedule     │  │ ValidationSv │  │
│  │ Lesson       │  │ Duration     │  │ QRCodeServ   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Repositories │  │ External APIs│  │   Caching    │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ CourseRepo   │  │ LiveKit      │  │ Redis        │  │
│  │ SessionRepo  │  │ S3/Storage   │  │ Cache Manager│  │
│  │ LessonRepo   │  │ AI Services  │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/features/courses/
├── application/                    # Application Layer
│   ├── commands/                   # Write operations
│   │   ├── create-course/
│   │   │   ├── create-course.command.ts
│   │   │   ├── create-course.handler.ts
│   │   │   └── create-course.dto.ts
│   │   ├── update-course/
│   │   ├── add-session/
│   │   ├── add-lesson/
│   │   ├── clone-course/
│   │   └── bulk-import-sessions/
│   │
│   ├── queries/                    # Read operations
│   │   ├── get-courses/
│   │   │   ├── get-courses.query.ts
│   │   │   ├── get-courses.handler.ts
│   │   │   └── get-courses.dto.ts
│   │   ├── get-course-by-id/
│   │   ├── search-courses/
│   │   └── get-course-statistics/
│   │
│   └── services/                   # Application services
│       ├── course-validation.service.ts
│       ├── course-template.service.ts
│       └── course-export.service.ts
│
├── domain/                         # Domain Layer
│   ├── entities/
│   │   ├── course.entity.ts
│   │   ├── course-session.entity.ts
│   │   ├── lesson.entity.ts
│   │   └── course-template.entity.ts
│   │
│   ├── value-objects/
│   │   ├── money.vo.ts
│   │   ├── schedule.vo.ts
│   │   ├── duration.vo.ts
│   │   └── course-status.vo.ts
│   │
│   ├── services/                   # Domain services
│   │   ├── pricing.service.ts
│   │   ├── scheduling.service.ts
│   │   └── capacity-management.service.ts
│   │
│   └── repositories/               # Repository interfaces
│       ├── course.repository.interface.ts
│       └── course-template.repository.interface.ts
│
├── infrastructure/                 # Infrastructure Layer
│   ├── repositories/               # Repository implementations
│   │   ├── typeorm-course.repository.ts
│   │   └── typeorm-course-template.repository.ts
│   │
│   ├── external/                   # External service integrations
│   │   ├── livekit.service.ts
│   │   ├── storage.service.ts
│   │   └── ai-content.service.ts
│   │
│   └── caching/
│       └── course-cache.service.ts
│
├── presentation/                   # Presentation Layer
│   ├── controllers/
│   │   ├── courses.controller.ts
│   │   ├── course-templates.controller.ts
│   │   └── course-admin.controller.ts
│   │
│   ├── dto/                        # Data Transfer Objects
│   │   ├── create-course.dto.ts
│   │   ├── update-course.dto.ts
│   │   └── course-response.dto.ts
│   │
│   └── validators/                 # Custom validators
│       ├── unique-course-title.validator.ts
│       └── valid-schedule.validator.ts
│
└── courses.module.ts               # Module definition
```

---

## 🗓️ LỘ TRÌNH TRIỂN KHAI

### Timeline Tổng Thể: **4 Tuần**

```
Week 1: Foundation & Refactoring
Week 2: Advanced Features
Week 3: UX & Performance
Week 4: Testing & Documentation
```

### Chi Tiết Từng Tuần

#### **WEEK 1: Foundation & Refactoring** (5 ngày)

```
Day 1-2: Setup CQRS Architecture
├── Tạo folder structure
├── Implement Command/Query pattern
├── Migrate existing logic
└── Unit tests

Day 3: Domain Layer
├── Create Value Objects
├── Implement Domain Services
└── Refactor entities

Day 4-5: Repository Pattern
├── Create repository interfaces
├── Implement TypeORM repositories
├── Add caching layer
└── Integration tests
```

#### **WEEK 2: Advanced Features** (5 ngày)

```
Day 1: Course Templates
├── Template entity & repository
├── Create/Update/Delete templates
├── Apply template to new course
└── Template marketplace (optional)

Day 2: Bulk Operations
├── CSV/Excel import parser
├── Bulk session creation
├── Bulk lesson creation
└── Error handling & validation

Day 3: Auto-Save & Versioning
├── Draft auto-save mechanism
├── Version control system
├── Restore previous version
└── Conflict resolution

Day 4: Course Cloning
├── Deep clone logic
├── Clone with options
├── Update references
└── Testing

Day 5: AI Integration
├── OpenAI API setup
├── Description generation
├── Structure suggestion
└── Content enhancement
```

#### **WEEK 3: UX & Performance** (5 ngày)

```
Day 1-2: Multi-Step Wizard
├── Frontend wizard component
├── Progress tracking
├── Step validation
├── Navigation logic
└── Mobile responsive

Day 3: Rich Text Editor
├── Integrate TipTap/Quill
├── Image upload
├── Video embedding
└── Markdown support

Day 4: Performance Optimization
├── Database indexing
├── Query optimization
├── Redis caching
└── Load testing

Day 5: File Upload Optimization
├── Direct S3 upload
├── Image compression
├── Video transcoding
└── Progress tracking
```

#### **WEEK 4: Testing & Documentation** (5 ngày)

```
Day 1-2: Comprehensive Testing
├── Unit tests (80% coverage)
├── Integration tests
├── E2E tests
└── Load tests

Day 3: API Documentation
├── OpenAPI/Swagger specs
├── Example requests/responses
├── Error code documentation
└── Postman collection

Day 4: Developer Documentation
├── Architecture diagrams
├── Code documentation
├── Setup guides
└── Contribution guidelines

Day 5: Deployment & Monitoring
├── Deploy to staging
├── Performance monitoring
├── Error tracking (Sentry)
└── User acceptance testing
```

---

## ⚠️ ĐÁNH GIÁ RỦI RO & KHUYẾN NGHỊ

> **Cập nhật**: 2025-12-03  
> **Nguồn**: Technical Review & QA Analysis

### 🔴 Cảnh Báo Quan Trọng: Timeline

**Vấn đề**: Lộ trình 4 tuần (20 ngày làm việc) là **CỰC KỲ THAM VỌNG** (aggressive) cho khối lượng công việc này.

#### Chi Tiết Rủi Ro

**Week 1 - CQRS Refactoring**:
- ⚠️ Refactor CoursesService 1,000 dòng sang CQRS hoàn chỉnh trong 5 ngày là **RỦI RO CAO**
- Việc tách logic cũ và viết unit test thường tốn **gấp đôi** thời gian dự kiến
- Migration strategy (chạy song song 2 service) cần thêm thời gian để handle transaction chung

**Week 2 & 3 - Parallel Development**:
- ⚠️ Làm song song Backend (Templates) và Frontend (Wizard, Rich Text) trong 10 ngày
- Dễ dẫn đến: Backend chưa xong API thì Frontend đã cần để integration
- Frontend team bị block, phải mock data

**Week 4 - Testing**:
- ⚠️ Các ngày "Testing & Documentation" thường bị xem nhẹ và làm tràn sang tuần sau
- E2E testing cần nhiều thời gian hơn dự kiến

### ✅ Khuyến Nghị Điều Chỉnh

#### Option 1: Tăng Timeline (Khuyến nghị)
```
Timeline mới: 6 TUẦN (30 ngày làm việc)

Week 1-2: CQRS Refactoring (10 ngày)
  ├── Thêm thời gian cho migration strategy
  ├── Comprehensive unit testing
  └── Buffer cho unexpected issues

Week 3-4: Advanced Features (10 ngày)
  ├── Templates (bỏ Marketplace trong V2.0)
  ├── Bulk Operations
  ├── Auto-Save & Versioning
  └── Course Cloning (bỏ AI Integration)

Week 5: UX & Performance (5 ngày)
  ├── Multi-Step Wizard
  ├── Rich Text Editor (3 ngày thay vì 1)
  └── Performance Optimization

Week 6: Testing & Documentation (5 ngày)
  ├── E2E Testing (bắt đầu sớm từ Week 3)
  ├── Load Testing
  ├── Documentation
  └── Deployment & UAT
```

#### Option 2: Giảm Scope (Nếu phải giữ 4 tuần)
```
Bỏ các features sau khỏi V2.0:
❌ Template Marketplace (public sharing, rating)
❌ AI Integration (description generation)
❌ Advanced Versioning (chỉ giữ basic draft)
❌ Bulk Import CSV (chỉ manual add)

→ Áp lực giảm 40%
→ Các features này chuyển sang V2.1
```

### 📋 Action Items Trước Khi Bắt Đầu

- [ ] **Họp team** để chốt: Timeline 6 tuần HOẶC giảm scope
- [ ] **Backend chốt Swagger/OpenAPI** ngay từ đầu Week 2
- [ ] **Setup mock API** cho Frontend làm việc parallel
- [ ] **Cài đặt Playwright** ngay khi xong Wizard Step 1 (không đợi Week 4)
- [ ] **Dành 1-2 ngày riêng** cho Database Migration script
- [ ] **Set performance budget**: Page load < 2s, API < 200ms (p95)

### 🎯 Scope Priorities (MoSCoW)

**Must Have (V2.0)**:
- ✅ CQRS Architecture
- ✅ Basic Templates (private only)
- ✅ Multi-Step Wizard
- ✅ Auto-Save (basic)
- ✅ Rich Text Editor

**Should Have (V2.0 if time permits)**:
- ⚠️ Course Cloning
- ⚠️ Bulk Operations
- ⚠️ Advanced Validation

**Could Have (V2.1)**:
- 🔵 Template Marketplace
- 🔵 AI Integration
- 🔵 Advanced Versioning

**Won't Have (V2.0)**:
- ❌ Template Rating System
- ❌ AI Content Generation
- ❌ Advanced Analytics

---

## 📝 CHI TIẾT TỪNG PHASE

### PHASE 1: CQRS Architecture Setup

#### Objectives
- Tách biệt read/write operations
- Cải thiện maintainability
- Tăng testability

#### Implementation

**1. Create Command Structure**

```typescript
// src/features/courses/application/commands/create-course/create-course.command.ts
export class CreateCourseCommand {
  constructor(
    public readonly teacherId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly category: string,
    public readonly level: CourseLevel,
    public readonly pricing: {
      fullCourse?: number;
      perSession?: number;
    },
    public readonly capacity: {
      maxStudents: number;
    }
  ) {}
}

// create-course.handler.ts
@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly validationService: CourseValidationService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateCourseCommand): Promise<Course> {
    // 1. Validate
    await this.validationService.validateNewCourse(command);
    
    // 2. Create domain entity
    const course = Course.create({
      teacherId: command.teacherId,
      title: command.title,
      description: command.description,
      // ... other fields
    });
    
    // 3. Save
    const savedCourse = await this.courseRepository.save(course);
    
    // 4. Publish event
    this.eventBus.publish(new CourseCreatedEvent(savedCourse));
    
    return savedCourse;
  }
}
```

**2. Create Query Structure**

```typescript
// src/features/courses/application/queries/get-courses/get-courses.query.ts
export class GetCoursesQuery {
  constructor(
    public readonly filters: {
      category?: string;
      level?: CourseLevel;
      minPrice?: number;
      maxPrice?: number;
      teacherId?: string;
      isPublished?: boolean;
    },
    public readonly pagination: {
      page: number;
      limit: number;
    },
    public readonly sorting: {
      field: string;
      order: 'ASC' | 'DESC';
    }
  ) {}
}

// get-courses.handler.ts
@QueryHandler(GetCoursesQuery)
export class GetCoursesHandler implements IQueryHandler<GetCoursesQuery> {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetCoursesQuery): Promise<PaginatedResult<Course>> {
    // 1. Check cache
    const cacheKey = this.buildCacheKey(query);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    
    // 2. Query database
    const result = await this.courseRepository.findWithFilters(
      query.filters,
      query.pagination,
      query.sorting
    );
    
    // 3. Cache result
    await this.cacheService.set(cacheKey, result, 300); // 5 minutes
    
    return result;
  }
}
```

**3. Value Objects**

```typescript
// src/features/courses/domain/value-objects/money.vo.ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string = 'USD'
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  static create(amount: number, currency?: string): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}

// Usage
const price = Money.create(100);
const discountedPrice = price.multiply(0.8); // 20% discount
```

**4. Domain Services**

```typescript
// src/features/courses/domain/services/pricing.service.ts
@Injectable()
export class PricingService {
  calculateFullCourseDiscount(
    pricePerSession: Money,
    totalSessions: number,
    discountPercentage: number
  ): Money {
    const totalPrice = pricePerSession.multiply(totalSessions);
    const discountFactor = 1 - (discountPercentage / 100);
    return totalPrice.multiply(discountFactor);
  }

  validatePricing(fullCoursePrice: Money, perSessionPrice: Money, totalSessions: number): void {
    const totalSessionPrice = perSessionPrice.multiply(totalSessions);
    
    if (fullCoursePrice.getAmount() >= totalSessionPrice.getAmount()) {
      throw new Error('Full course price must be less than total session price');
    }
    
    const discount = ((totalSessionPrice.getAmount() - fullCoursePrice.getAmount()) / totalSessionPrice.getAmount()) * 100;
    
    if (discount < 10 || discount > 50) {
      throw new Error('Discount must be between 10% and 50%');
    }
  }
}
```

---

### PHASE 2: Course Templates

#### Database Schema

```sql
CREATE TABLE course_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by VARCHAR(36) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  level VARCHAR(50),
  
  -- Structure definition
  total_sessions INT NOT NULL,
  sessions_per_week INT,
  lesson_duration_minutes INT,
  
  -- Template data (JSON)
  session_structure JSON NOT NULL,
  default_materials JSON,
  
  -- Metadata
  usage_count INT DEFAULT 0,
  rating DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_category (category),
  INDEX idx_level (level),
  INDEX idx_is_public (is_public)
);
```

#### Implementation

```typescript
// Entity
@Entity('course_templates')
export class CourseTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'total_sessions' })
  totalSessions: number;

  @Column({ name: 'session_structure', type: 'json' })
  sessionStructure: SessionTemplateStructure[];

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;
}

// Service
@Injectable()
export class CourseTemplateService {
  async createTemplate(
    userId: string,
    dto: CreateTemplateDto
  ): Promise<CourseTemplate> {
    const template = this.templateRepository.create({
      name: dto.name,
      description: dto.description,
      createdBy: userId,
      isPublic: dto.isPublic,
      sessionStructure: dto.sessionStructure,
    });

    return this.templateRepository.save(template);
  }

  async applyTemplate(
    templateId: string,
    courseData: Partial<CreateCourseDto>
  ): Promise<Course> {
    const template = await this.templateRepository.findOne(templateId);
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Create course with template structure
    const course = await this.courseService.createCourse({
      ...courseData,
      totalSessions: template.totalSessions,
    });

    // Create sessions based on template
    for (const sessionTemplate of template.sessionStructure) {
      await this.courseService.addSession(course.id, {
        title: sessionTemplate.title,
        description: sessionTemplate.description,
        duration: sessionTemplate.duration,
        // ... other fields
      });
    }

    // Increment usage count
    await this.templateRepository.increment(
      { id: templateId },
      'usageCount',
      1
    );

    return course;
  }
}
```

---

### PHASE 3: Bulk Operations

#### CSV Import Format

```csv
session_number,title,description,date,start_time,end_time
1,Introduction & Greetings,Learn basic greetings,2025-12-10,14:00,16:00
2,Daily Conversations,Practice daily scenarios,2025-12-12,14:00,16:00
3,Shopping & Dining,Restaurant and shopping vocabulary,2025-12-15,14:00,16:00
```

#### Implementation

```typescript
// DTO
export class BulkImportSessionsDto {
  @IsNotEmpty()
  @IsString()
  courseId: string;

  @IsNotEmpty()
  file: Express.Multer.File;
}

// Service
@Injectable()
export class BulkImportService {
  async importSessionsFromCSV(
    courseId: string,
    file: Express.Multer.File
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Parse CSV
    const records = await this.parseCSV(file.buffer);

    // Validate course exists
    const course = await this.courseRepository.findOne(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Process each row
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        
        // Validate row data
        await this.validateSessionData(record);
        
        // Create session
        await this.courseService.addSession(courseId, {
          sessionNumber: parseInt(record.session_number),
          title: record.title,
          description: record.description,
          scheduledDate: new Date(record.date),
          startTime: record.start_time,
          endTime: record.end_time,
        });
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // +2 because row 1 is header, and 0-indexed
          error: error.message,
        });
      }
    }

    return results;
  }

  private async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(buffer);
      
      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
}

// Controller
@Post(':courseId/sessions/bulk-import')
@UseInterceptors(FileInterceptor('file'))
async bulkImportSessions(
  @Param('courseId') courseId: string,
  @UploadedFile() file: Express.Multer.File,
  @GetUser() user: User,
) {
  // Verify ownership
  await this.courseService.verifyOwnership(courseId, user.id);
  
  // Import
  const result = await this.bulkImportService.importSessionsFromCSV(
    courseId,
    file
  );
  
  return {
    message: `Imported ${result.success} sessions successfully`,
    success: result.success,
    failed: result.failed,
    errors: result.errors,
  };
}
```

---

### PHASE 4: Auto-Save & Versioning

#### Database Schema

```sql
CREATE TABLE course_drafts (
  id VARCHAR(36) PRIMARY KEY,
  course_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  data JSON NOT NULL,
  is_auto_saved BOOLEAN DEFAULT TRUE,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_course_user (course_id, user_id),
  INDEX idx_version (course_id, version)
);
```

#### Implementation

```typescript
// Entity
@Entity('course_drafts')
export class CourseDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  version: number;

  @Column({ type: 'json' })
  data: Partial<Course>;

  @Column({ name: 'is_auto_saved', default: true })
  isAutoSaved: boolean;

  @CreateDateColumn({ name: 'saved_at' })
  savedAt: Date;
}

// Service
@Injectable()
export class DraftService {
  async saveDraft(
    userId: string,
    courseId: string | null,
    data: Partial<Course>,
    isAutoSaved: boolean = true
  ): Promise<CourseDraft> {
    // Get latest version
    const latestVersion = await this.draftRepository
      .createQueryBuilder('draft')
      .where('draft.userId = :userId', { userId })
      .andWhere(courseId ? 'draft.courseId = :courseId' : 'draft.courseId IS NULL', { courseId })
      .orderBy('draft.version', 'DESC')
      .getOne();

    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    // Create new draft
    const draft = this.draftRepository.create({
      courseId,
      userId,
      version: newVersion,
      data,
      isAutoSaved,
    });

    return this.draftRepository.save(draft);
  }

  async getDraftHistory(
    userId: string,
    courseId: string
  ): Promise<CourseDraft[]> {
    return this.draftRepository.find({
      where: { userId, courseId },
      order: { version: 'DESC' },
    });
  }

  async restoreVersion(
    userId: string,
    draftId: string
  ): Promise<Partial<Course>> {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId, userId },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return draft.data;
  }
}

// Frontend: Auto-save hook
function useAutoSave(courseId: string, data: Partial<Course>) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await api.courses.saveDraft(courseId, data);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [courseId, data]);

  return { lastSaved, isSaving };
}
```

---

## ⚠️ ĐÁNH GIÁ RỦI RO

### Rủi Ro Cao 🔴

1. **Breaking Changes**
   - **Vấn đề**: Refactoring có thể break existing code
   - **Giải pháp**: 
     - Implement feature flags
     - Parallel running old/new code
     - Comprehensive testing
     - Gradual migration

2. **Performance Degradation**
   - **Vấn đề**: CQRS có thể làm chậm hệ thống
   - **Giải pháp**:
     - Benchmark before/after
     - Optimize queries
     - Implement caching
     - Load testing

3. **Data Migration**
   - **Vấn đề**: Migrate existing data sang new structure
   - **Giải pháp**:
     - Write migration scripts
     - Test on staging
     - Backup before migration
     - Rollback plan

### Rủi Ro Trung Bình 🟡

4. **Learning Curve**
   - **Vấn đề**: Team cần học CQRS pattern
   - **Giải pháp**:
     - Training sessions
     - Documentation
     - Code reviews
     - Pair programming

5. **Third-party Dependencies**
   - **Vấn đề**: AI services, storage services có thể fail
   - **Giải pháp**:
     - Fallback mechanisms
     - Error handling
     - Retry logic
     - Circuit breaker pattern

### Rủi Ro Thấp 🟢

6. **UI/UX Changes**
   - **Vấn đề**: Users cần adapt to new interface
   - **Giải pháp**:
     - User testing
     - Gradual rollout
     - Tutorial/onboarding
     - Feedback collection

---

## ✅ TIÊU CHÍ THÀNH CÔNG

### Technical Metrics

```
✅ Code Quality
├── Service files < 300 lines
├── Function complexity < 10
├── Test coverage > 80%
└── No critical code smells

✅ Performance
├── API response time < 200ms (p95)
├── Database queries < 50ms
├── Page load time < 2s
└── Support 1000 concurrent users

✅ Reliability
├── Uptime > 99.9%
├── Error rate < 0.1%
├── Zero data loss
└── Successful rollback capability
```

### Business Metrics

```
✅ User Experience
├── Course creation time < 10 minutes
├── Template usage > 30%
├── User satisfaction > 4.5/5
└── Support tickets < 5/week

✅ Adoption
├── 80% teachers use new features
├── 50% courses use templates
├── 70% use bulk import
└── 90% use auto-save
```

### Documentation

```
✅ Completeness
├── All APIs documented (OpenAPI)
├── Architecture diagrams created
├── Developer guides written
└── User guides available

✅ Accessibility
├── Code comments > 20%
├── README files in all modules
├── Examples for all features
└── Video tutorials created
```

---

## 📚 TÀI LIỆU THAM KHẢO

### Internal Documents
- [PHASE1_COURSE_MANAGEMENT.md](./PHASE1_COURSE_MANAGEMENT.md)
- [SYSTEM_AUDIT_REPORT.md](../SYSTEM_AUDIT_REPORT.md)
- [MODULARIZATION_ARCHITECTURE.md](../MODULARIZATION_ARCHITECTURE.md)

### External Resources
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Người tạo**: AI Assistant  
**Ngày**: 2025-12-02  
**Trạng thái**: ✅ Ready for Implementation
