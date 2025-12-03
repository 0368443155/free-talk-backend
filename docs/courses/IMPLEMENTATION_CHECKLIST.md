# ✅ COURSE CREATION SYSTEM - Implementation Checklist

**Dự án**: TalkConnect Platform  
**Timeline**: 4 Tuần  
**Bắt đầu**: [Ngày bắt đầu]  
**Kết thúc dự kiến**: [Ngày kết thúc]

---

## 📊 TỔNG QUAN TIẾN ĐỘ

```
┌─────────────────────────────────────────────────────────┐
│  OVERALL PROGRESS: [ ] 0% Complete                      │
│  ████████████████████████████████████░░░░░░░░░░░░░░░░  │
│                                                          │
│  Week 1: CQRS Refactoring        [ ] 0/5 days           │
│  Week 2: Course Templates        [ ] 0/5 days           │
│  Week 3: UX Improvements         [ ] 0/5 days           │
│  Week 4: Testing & Docs          [ ] 0/5 days           │
└─────────────────────────────────────────────────────────┘
```

---

## 🗓️ WEEK 1: CQRS ARCHITECTURE REFACTORING

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete  
**Progress**: 0/40 tasks

### Day 1: Setup & Commands (Part 1)

#### Morning Session
- [ ] **Setup Project Structure**
  - [ ] Create `application/commands` folder
  - [ ] Create `application/queries` folder
  - [ ] Create `application/services` folder
  - [ ] Create `domain/value-objects` folder
  - [ ] Create `domain/services` folder
  - [ ] Create `domain/repositories` folder
  - [ ] Create `infrastructure/repositories` folder
  - [ ] Create `infrastructure/caching` folder

- [ ] **Install Dependencies**
  - [ ] `npm install @nestjs/cqrs`
  - [ ] `npm install class-validator class-transformer`
  - [ ] `npm install cache-manager`
  - [ ] Verify all packages installed

#### Afternoon Session
- [ ] **Create Base Classes**
  - [ ] Create `BaseCommand` class
  - [ ] Create `BaseQuery` class
  - [ ] Create repository interfaces

- [ ] **Implement CreateCourse Command**
  - [ ] Create `create-course.command.ts`
  - [ ] Create `create-course.handler.ts`
  - [ ] Create `create-course.dto.ts`
  - [ ] Add validation rules
  - [ ] Test command execution

### Day 2: Commands (Part 2)

#### Morning Session
- [ ] **Repository Layer**
  - [ ] Create `ICourseRepository` interface
  - [ ] Implement `TypeOrmCourseRepository`
  - [ ] Add `save()` method
  - [ ] Add `findById()` method
  - [ ] Add `findAll()` method
  - [ ] Add `update()` method
  - [ ] Add `delete()` method
  - [ ] Add `existsByTitleAndTeacher()` method

- [ ] **Validation Service**
  - [ ] Create `CourseValidationService`
  - [ ] Implement `validatePricing()`
  - [ ] Implement `validateSchedule()`
  - [ ] Implement `validateCapacity()`
  - [ ] Add unit tests

#### Afternoon Session
- [ ] **More Commands**
  - [ ] Create `UpdateCourseCommand` + Handler
  - [ ] Create `DeleteCourseCommand` + Handler
  - [ ] Create `PublishCourseCommand` + Handler
  - [ ] Create `UnpublishCourseCommand` + Handler
  - [ ] Test all commands

- [ ] **Module Configuration**
  - [ ] Update `courses.module.ts`
  - [ ] Register all command handlers
  - [ ] Register repositories
  - [ ] Register services
  - [ ] Verify DI working

### Day 3: Queries

#### Morning Session
- [ ] **GetCourses Query**
  - [ ] Create `get-courses.query.ts`
  - [ ] Create `get-courses.handler.ts`
  - [ ] Create `get-courses.dto.ts`
  - [ ] Implement filtering logic
  - [ ] Implement pagination
  - [ ] Implement sorting

- [ ] **Cache Service**
  - [ ] Create `CacheService`
  - [ ] Implement `get()` method
  - [ ] Implement `set()` method
  - [ ] Implement `del()` method
  - [ ] Implement `delPattern()` method
  - [ ] Implement `invalidateCourseCache()`

#### Afternoon Session
- [ ] **More Queries**
  - [ ] Create `GetCourseByIdQuery` + Handler
  - [ ] Create `GetTeacherCoursesQuery` + Handler
  - [ ] Create `SearchCoursesQuery` + Handler
  - [ ] Implement caching for all queries
  - [ ] Test query performance

- [ ] **Controller Updates**
  - [ ] Update `CoursesController`
  - [ ] Use `CommandBus` for writes
  - [ ] Use `QueryBus` for reads
  - [ ] Add proper error handling
  - [ ] Test all endpoints

### Day 4: Session & Lesson Commands

#### Morning Session
- [ ] **Session Commands**
  - [ ] Create `AddSessionCommand` + Handler
  - [ ] Create `UpdateSessionCommand` + Handler
  - [ ] Create `DeleteSessionCommand` + Handler
  - [ ] Create session repository interface
  - [ ] Implement TypeORM session repository
  - [ ] Test session commands

#### Afternoon Session
- [ ] **Lesson Commands**
  - [ ] Create `AddLessonCommand` + Handler
  - [ ] Create `UpdateLessonCommand` + Handler
  - [ ] Create `DeleteLessonCommand` + Handler
  - [ ] Create lesson repository interface
  - [ ] Implement TypeORM lesson repository
  - [ ] Test lesson commands

### Day 5: Testing & Documentation

#### Morning Session
- [ ] **Unit Tests**
  - [ ] Test CreateCourseHandler (>90% coverage)
  - [ ] Test UpdateCourseHandler
  - [ ] Test DeleteCourseHandler
  - [ ] Test GetCoursesHandler
  - [ ] Test GetCourseByIdHandler
  - [ ] Test all repositories
  - [ ] Test validation service
  - [ ] Overall coverage > 80%

#### Afternoon Session
- [ ] **Integration Tests**
  - [ ] Test POST /api/courses
  - [ ] Test GET /api/courses
  - [ ] Test GET /api/courses/:id
  - [ ] Test PUT /api/courses/:id
  - [ ] Test DELETE /api/courses/:id
  - [ ] Test error scenarios
  - [ ] Test authentication/authorization

- [ ] **Documentation**
  - [ ] Update API documentation
  - [ ] Add code comments
  - [ ] Update README
  - [ ] Create migration guide

**Week 1 Review**: [ ] Code review completed | [ ] All tests passing | [ ] Documentation updated

---

## 🗓️ WEEK 2: COURSE TEMPLATES SYSTEM

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete  
**Progress**: 0/35 tasks

### Day 1: Database & Entities

#### Morning Session
- [ ] **Database Schema**
  - [ ] Create migration for `course_templates` table
  - [ ] Create migration for `template_ratings` table
  - [ ] Create migration for `template_usage` table
  - [ ] Run migrations
  - [ ] Verify tables created
  - [ ] Add indexes
  - [ ] Test foreign keys

#### Afternoon Session
- [ ] **Entities**
  - [ ] Create `CourseTemplate` entity
  - [ ] Create `TemplateRating` entity
  - [ ] Create `TemplateUsage` entity
  - [ ] Define JSON column types
  - [ ] Add relations
  - [ ] Test entity creation

- [ ] **DTOs**
  - [ ] Create `CreateTemplateDto`
  - [ ] Create `UpdateTemplateDto`
  - [ ] Create `GetTemplatesDto`
  - [ ] Create `CreateFromTemplateDto`
  - [ ] Create `RateTemplateDto`
  - [ ] Add validation rules

### Day 2: Commands

#### Morning Session
- [ ] **CreateTemplate Command**
  - [ ] Create command class
  - [ ] Create handler
  - [ ] Calculate metadata (duration, sessions)
  - [ ] Validate structure
  - [ ] Test creation

- [ ] **CreateCourseFromTemplate Command**
  - [ ] Create command class
  - [ ] Create handler
  - [ ] Load template
  - [ ] Create course from template
  - [ ] Create sessions from structure
  - [ ] Create lessons from structure
  - [ ] Increment usage count
  - [ ] Track usage
  - [ ] Test full flow

#### Afternoon Session
- [ ] **More Commands**
  - [ ] Create `UpdateTemplateCommand` + Handler
  - [ ] Create `DeleteTemplateCommand` + Handler
  - [ ] Create `RateTemplateCommand` + Handler
  - [ ] Create `PublishTemplateCommand` + Handler
  - [ ] Test all commands

### Day 3: Queries & Repository

#### Morning Session
- [ ] **Repository**
  - [ ] Create `ITemplateRepository` interface
  - [ ] Implement `TypeOrmTemplateRepository`
  - [ ] Implement `findAll()` with filters
  - [ ] Implement `findById()`
  - [ ] Implement `incrementUsageCount()`
  - [ ] Implement `trackUsage()`
  - [ ] Implement `updateRating()`
  - [ ] Test repository methods

#### Afternoon Session
- [ ] **Queries**
  - [ ] Create `GetTemplatesQuery` + Handler
  - [ ] Create `GetTemplateByIdQuery` + Handler
  - [ ] Create `GetMyTemplatesQuery` + Handler
  - [ ] Create `GetFeaturedTemplatesQuery` + Handler
  - [ ] Create `SearchTemplatesQuery` + Handler
  - [ ] Test all queries

### Day 4: API & Integration

#### Morning Session
- [ ] **Controller**
  - [ ] Create `CourseTemplatesController`
  - [ ] Implement POST /api/course-templates
  - [ ] Implement GET /api/course-templates
  - [ ] Implement GET /api/course-templates/:id
  - [ ] Implement POST /api/course-templates/:id/use
  - [ ] Implement POST /api/course-templates/:id/rate
  - [ ] Implement PUT /api/course-templates/:id
  - [ ] Implement DELETE /api/course-templates/:id
  - [ ] Add authentication guards
  - [ ] Add authorization checks

#### Afternoon Session
- [ ] **Integration Tests**
  - [ ] Test create template
  - [ ] Test get templates with filters
  - [ ] Test create course from template
  - [ ] Test rate template
  - [ ] Test update template
  - [ ] Test delete template
  - [ ] Test error scenarios

### Day 5: Frontend & Testing

#### Morning Session
- [ ] **Frontend Components**
  - [ ] Create TemplateBrowser component
  - [ ] Create TemplateCard component
  - [ ] Create TemplateDetail component
  - [ ] Create CreateTemplateForm
  - [ ] Create UseTemplateModal
  - [ ] Add filters & search
  - [ ] Add pagination

#### Afternoon Session
- [ ] **E2E Tests**
  - [ ] Test browse templates
  - [ ] Test view template details
  - [ ] Test create template
  - [ ] Test use template to create course
  - [ ] Test rate template
  - [ ] Test template marketplace flow

- [ ] **Documentation**
  - [ ] API documentation
  - [ ] User guide
  - [ ] Template creation guide

**Week 2 Review**: [ ] Code review completed | [ ] All tests passing | [ ] Documentation updated

---

## 🗓️ WEEK 3: UX IMPROVEMENTS

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete  
**Progress**: 0/30 tasks

### Day 1: Wizard Structure

#### Morning Session
- [ ] **Wizard Components**
  - [ ] Create `CourseWizard` component
  - [ ] Create `ProgressIndicator` component
  - [ ] Create `WizardStep` component
  - [ ] Create `WizardNavigation` component
  - [ ] Setup wizard state management
  - [ ] Implement step navigation

#### Afternoon Session
- [ ] **Wizard Steps**
  - [ ] Create Step 1: Basic Information
  - [ ] Create Step 2: Pricing & Capacity
  - [ ] Create Step 3: Sessions Planning
  - [ ] Create Step 4: Lessons & Content
  - [ ] Create Step 5: Review & Publish
  - [ ] Connect steps to wizard
  - [ ] Test navigation flow

### Day 2: Auto-Save

#### Morning Session
- [ ] **Backend**
  - [ ] Create `course_drafts` table migration
  - [ ] Create `CourseDraft` entity
  - [ ] Create `SaveDraftCommand` + Handler
  - [ ] Create `GetDraftsQuery` + Handler
  - [ ] Create `RestoreDraftCommand` + Handler
  - [ ] Add API endpoints

#### Afternoon Session
- [ ] **Frontend**
  - [ ] Create `useAutoSave` hook
  - [ ] Create `AutoSaveIndicator` component
  - [ ] Create `DraftRecovery` modal
  - [ ] Implement auto-save (30s interval)
  - [ ] Implement manual save
  - [ ] Test auto-save functionality

### Day 3: Rich Text Editor

#### Morning Session
- [ ] **TipTap Setup**
  - [ ] Install TipTap packages
  - [ ] Create `RichTextEditor` component
  - [ ] Create `MenuBar` component
  - [ ] Add basic formatting (bold, italic, etc.)
  - [ ] Add headings
  - [ ] Add lists

#### Afternoon Session
- [ ] **Advanced Features**
  - [ ] Add image upload
  - [ ] Add video embedding (YouTube)
  - [ ] Add code blocks
  - [ ] Add tables
  - [ ] Add link insertion
  - [ ] Style editor
  - [ ] Test all features

### Day 4: Preview & Validation

#### Morning Session
- [ ] **Preview Mode**
  - [ ] Create `CoursePreview` component
  - [ ] Create student view
  - [ ] Show course details
  - [ ] Show sessions
  - [ ] Show pricing
  - [ ] Add preview button
  - [ ] Test preview

#### Afternoon Session
- [ ] **Real-time Validation**
  - [ ] Create `useFieldValidation` hook
  - [ ] Implement title uniqueness check
  - [ ] Implement price validation
  - [ ] Implement schedule validation
  - [ ] Show inline errors
  - [ ] Show success feedback
  - [ ] Test validation

### Day 5: Polish & Testing

#### Morning Session
- [ ] **Responsive Design**
  - [ ] Mobile layout
  - [ ] Tablet layout
  - [ ] Desktop layout
  - [ ] Test on different devices

- [ ] **Accessibility**
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] ARIA labels
  - [ ] Focus management

#### Afternoon Session
- [ ] **User Testing**
  - [ ] Internal testing
  - [ ] Gather feedback
  - [ ] Fix bugs
  - [ ] Improve UX

- [ ] **Documentation**
  - [ ] User guide
  - [ ] Video tutorial
  - [ ] FAQ

**Week 3 Review**: [ ] Code review completed | [ ] All tests passing | [ ] Documentation updated

---

## 🗓️ WEEK 4: TESTING & DOCUMENTATION

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete  
**Progress**: 0/25 tasks

### Day 1-2: Comprehensive Testing

#### Day 1 Morning
- [ ] **Unit Tests**
  - [ ] All command handlers (>90% coverage)
  - [ ] All query handlers (>90% coverage)
  - [ ] All repositories (>90% coverage)
  - [ ] All services (>90% coverage)
  - [ ] All value objects
  - [ ] Overall backend coverage > 80%

#### Day 1 Afternoon
- [ ] **Integration Tests**
  - [ ] All API endpoints
  - [ ] Authentication flows
  - [ ] Authorization checks
  - [ ] Error scenarios
  - [ ] Edge cases

#### Day 2 Morning
- [ ] **E2E Tests**
  - [ ] Complete course creation flow
  - [ ] Template usage flow
  - [ ] Wizard navigation
  - [ ] Auto-save recovery
  - [ ] Preview mode
  - [ ] Publish course

#### Day 2 Afternoon
- [ ] **Performance Tests**
  - [ ] Load testing (1000 concurrent users)
  - [ ] API response times
  - [ ] Database query optimization
  - [ ] Caching effectiveness
  - [ ] Memory usage

### Day 3: API Documentation

#### Morning Session
- [ ] **OpenAPI/Swagger**
  - [ ] Install @nestjs/swagger
  - [ ] Add API decorators
  - [ ] Document all endpoints
  - [ ] Add request examples
  - [ ] Add response examples
  - [ ] Add error codes
  - [ ] Generate Swagger UI

#### Afternoon Session
- [ ] **Postman Collection**
  - [ ] Create collection
  - [ ] Add all endpoints
  - [ ] Add environment variables
  - [ ] Add test scripts
  - [ ] Export collection
  - [ ] Share with team

### Day 4: Developer Documentation

#### Morning Session
- [ ] **Architecture Docs**
  - [ ] Update architecture diagrams
  - [ ] Document CQRS pattern
  - [ ] Document repository pattern
  - [ ] Document caching strategy
  - [ ] Document testing strategy

#### Afternoon Session
- [ ] **Code Documentation**
  - [ ] Add JSDoc comments
  - [ ] Document complex logic
  - [ ] Add usage examples
  - [ ] Create developer guide
  - [ ] Create contribution guide

### Day 5: Deployment & Monitoring

#### Morning Session
- [ ] **Deployment**
  - [ ] Deploy to staging
  - [ ] Run smoke tests
  - [ ] Verify all features working
  - [ ] Performance check
  - [ ] Security audit

#### Afternoon Session
- [ ] **Monitoring**
  - [ ] Setup error tracking (Sentry)
  - [ ] Setup performance monitoring
  - [ ] Setup logging
  - [ ] Create dashboards
  - [ ] Setup alerts

- [ ] **Final Review**
  - [ ] Code review
  - [ ] Documentation review
  - [ ] User acceptance testing
  - [ ] Sign-off from stakeholders

**Week 4 Review**: [ ] All tests passing | [ ] Documentation complete | [ ] Ready for production

---

## 📊 SUCCESS CRITERIA

### Technical Metrics
- [ ] Test coverage > 80%
- [ ] API response time < 200ms (p95)
- [ ] Zero critical bugs
- [ ] All code reviewed
- [ ] Documentation complete

### Business Metrics
- [ ] Course creation time reduced to < 10 minutes
- [ ] Template usage > 30%
- [ ] User satisfaction > 4.5/5
- [ ] Zero data loss incidents
- [ ] Support tickets < 5/week

---

## 🎯 FINAL CHECKLIST

### Before Production
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] User guides created
- [ ] Training materials ready
- [ ] Rollback plan documented
- [ ] Monitoring setup
- [ ] Alerts configured
- [ ] Stakeholder sign-off

### Post-Launch
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Iterate on UX
- [ ] Update documentation
- [ ] Celebrate success! 🎉

---

**Last Updated**: [Date]  
**Updated By**: [Name]  
**Status**: [ ] In Progress | [ ] Complete
