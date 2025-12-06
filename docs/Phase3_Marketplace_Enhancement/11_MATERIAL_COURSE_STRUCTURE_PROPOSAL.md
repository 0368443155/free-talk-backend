# ĐỀ XUẤT: NÂNG CẤP MATERIALS THEO CẤU TRÚC COURSE-LIKE

## 📋 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Phân tích hiện trạng](#phân-tích-hiện-trạng)
3. [Mục tiêu](#mục-tiêu)
4. [Kiến trúc đề xuất](#kiến-trúc-đề-xuất)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Frontend UI/UX](#frontend-uiux)
8. [Material Lifecycle Management](#-material-lifecycle-management)
9. [Implementation Plan](#implementation-plan)
10. [Migration Strategy](#migration-strategy)
11. [Testing Strategy](#testing-strategy)
12. [Timeline & Effort Estimation](#timeline--effort-estimation)

---

## 📊 TỔNG QUAN

### Vấn đề hiện tại
- Materials hiện tại là **single-file uploads** (PDF, video, etc.)
- Không có cấu trúc phân cấp (sessions/lessons)
- Thiếu tính năng quản lý nội dung phức tạp
- Khó tổ chức nội dung dài hoặc nhiều phần

### Giải pháp đề xuất
Nâng cấp Materials để có cấu trúc tương tự Courses:
- **Material** (tương tự Course)
  - **Sessions** (nhóm các lessons)
    - **Lessons** (các file/content riêng lẻ)
      - PDF files
      - Video files
      - Audio files
      - Documents

---

## 🔍 PHÂN TÍCH HIỆN TRẠNG

### Materials hiện tại
```typescript
Material {
  id, teacher_id, title, description
  material_type (PDF, VIDEO, etc.)
  file_url (single file)
  preview_url, thumbnail_url
  price_credits
  rating, total_reviews
  // ... stats
}
```

### Courses hiện tại
```typescript
Course {
  id, teacher_id, title, description
  sessions: CourseSession[]
  // ... pricing, stats
}

CourseSession {
  id, course_id, session_number
  title, description
  lessons: Lesson[]
}

Lesson {
  id, session_id, lesson_number
  title, description
  scheduled_date, start_time, end_time
  meeting_id (LiveKit room)
  materials: LessonMaterial[] (attachments)
}
```

### So sánh

| Tính năng | Course | Material (hiện tại) | Material (đề xuất) |
|-----------|--------|---------------------|-------------------|
| Cấu trúc phân cấp | ✅ Sessions → Lessons | ❌ Single file | ✅ Sessions → Lessons |
| Thumbnail | ✅ | ⚠️ Optional | ✅ Required |
| Rating/Reviews | ✅ | ✅ | ✅ |
| Multiple files | ✅ (via LessonMaterials) | ❌ | ✅ (via Lessons) |
| Preview | ✅ (via free lessons) | ✅ (PDF preview) | ✅ (via free lessons) |
| LiveKit rooms | ✅ | ❌ | ❌ (không cần) |
| Scheduling | ✅ | ❌ | ❌ (không cần) |

---

## 🎯 MỤC TIÊU

### Mục tiêu chính
1. ✅ Cho phép Materials có cấu trúc phân cấp (Sessions → Lessons)
2. ✅ Hỗ trợ multiple files/content trong một Material
3. ✅ Giữ nguyên tính năng hiện có (rating, reviews, pricing)
4. ✅ Tương thích ngược với Materials cũ (single-file)
5. ✅ UI/UX tương tự Courses để dễ sử dụng

### Use Cases

#### Use Case 1: Tài liệu học tập nhiều phần
```
Material: "Complete IELTS Guide"
├── Session 1: "Reading Skills"
│   ├── Lesson 1: "Reading Strategy" (PDF)
│   ├── Lesson 2: "Practice Test 1" (PDF)
│   └── Lesson 3: "Reading Tips Video" (Video)
├── Session 2: "Writing Skills"
│   ├── Lesson 1: "Writing Templates" (PDF)
│   └── Lesson 2: "Sample Essays" (PDF)
└── Session 3: "Speaking Practice"
    ├── Lesson 1: "Pronunciation Guide" (Audio)
    └── Lesson 2: "Practice Exercises" (PDF)
```

#### Use Case 2: Khóa học video nhiều bài
```
Material: "React Mastery Course"
├── Session 1: "Basics"
│   ├── Lesson 1: "Introduction" (Video)
│   ├── Lesson 2: "Setup" (Video)
│   └── Lesson 3: "First Component" (Video)
└── Session 2: "Advanced"
    └── Lesson 1: "State Management" (Video)
```

#### Use Case 3: Material đơn giản (backward compatible)
```
Material: "Grammar Rules PDF"
└── (Single file, no sessions/lessons)
```

---

## 🏗️ KIẾN TRÚC ĐỀ XUẤT

### Entity Relationships

```
Material (1) ──< (N) MaterialSession
MaterialSession (1) ──< (N) MaterialLesson
MaterialLesson (1) ──< (1) File/Content

Material (1) ──< (N) MaterialReview
Material (1) ──< (N) MaterialPurchase
```

### Material Types

```typescript
enum MaterialStructureType {
  SIMPLE = 'simple',      // Single file (backward compatible)
  STRUCTURED = 'structured' // With sessions/lessons
}
```

### Flow

#### Creating a Material
1. Teacher tạo Material (title, description, pricing)
2. **Option A**: Upload single file → `MaterialStructureType.SIMPLE`
3. **Option B**: Tạo Sessions → Lessons → Upload files → `MaterialStructureType.STRUCTURED`

#### Viewing a Material
- **SIMPLE**: Hiển thị như hiện tại (single file)
- **STRUCTURED**: Hiển thị Sessions → Lessons (tương tự Course UI)

---

## 💾 DATABASE SCHEMA

### 1. Materials Table (UPDATE)

```sql
ALTER TABLE materials ADD COLUMN structure_type ENUM('simple', 'structured') DEFAULT 'simple';
ALTER TABLE materials ADD COLUMN thumbnail_url VARCHAR(500) NULL;
ALTER TABLE materials ADD COLUMN cover_image_url VARCHAR(500) NULL;
-- Keep existing file_url for backward compatibility
-- file_url will be NULL for structured materials
```

### 2. MaterialSessions Table (NEW)

```sql
CREATE TABLE material_sessions (
  id CHAR(36) PRIMARY KEY,
  material_id CHAR(36) NOT NULL,
  session_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Preview feature: Allow users to preview entire session before purchase
  is_preview BOOLEAN DEFAULT FALSE,
  
  -- Ordering
  order_index INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_material_id (material_id),
  INDEX idx_material_session_number (material_id, session_number),
  UNIQUE KEY uk_material_session (material_id, session_number),
  
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
```

### 3. MaterialLessons Table (NEW)

```sql
CREATE TABLE material_lessons (
  id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  lesson_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  
  -- Content info
  content_type ENUM('pdf', 'video', 'audio', 'document', 'slide', 'ebook') NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NULL,
  duration INT NULL, -- seconds for video/audio
  page_count INT NULL, -- for PDFs
  
  -- Preview
  preview_url VARCHAR(500) NULL,
  thumbnail_url VARCHAR(500) NULL,
  
  -- Free preview
  is_preview BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT FALSE,
  
  -- Ordering
  order_index INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_session_id (session_id),
  INDEX idx_session_lesson_number (session_id, lesson_number),
  UNIQUE KEY uk_session_lesson (session_id, lesson_number),
  
  FOREIGN KEY (session_id) REFERENCES material_sessions(id) ON DELETE CASCADE
);
```

### 4. MaterialPurchaseLessons (NEW - Track progress)

```sql
CREATE TABLE material_purchase_lessons (
  id CHAR(36) PRIMARY KEY,
  purchase_id CHAR(36) NOT NULL,
  lesson_id CHAR(36) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  last_position INT NULL, -- for videos (seconds)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_purchase_id (purchase_id),
  INDEX idx_lesson_id (lesson_id),
  UNIQUE KEY uk_purchase_lesson (purchase_id, lesson_id),
  
  FOREIGN KEY (purchase_id) REFERENCES material_purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES material_lessons(id) ON DELETE CASCADE
);
```

### Migration Plan

```typescript
// Step 1: Add new columns to materials
ALTER TABLE materials ADD COLUMN structure_type ENUM('simple', 'structured') DEFAULT 'simple';
ALTER TABLE materials ADD COLUMN thumbnail_url VARCHAR(500) NULL;
ALTER TABLE materials ADD COLUMN cover_image_url VARCHAR(500) NULL;

// Step 2: Migrate existing materials
UPDATE materials SET structure_type = 'simple' WHERE structure_type IS NULL;

// Step 3: Create new tables
CREATE TABLE material_sessions (...);
CREATE TABLE material_lessons (...);
CREATE TABLE material_purchase_lessons (...);
```

---

## 🔌 API DESIGN

### Material Endpoints

#### 1. Create Material (Simple)
```typescript
POST /api/v1/marketplace/teacher/materials
{
  title: string;
  description: string;
  material_type: 'pdf' | 'video' | ...;
  file_url: string; // Direct upload
  price_credits: number;
  // ... other fields
}
// Returns: Material (structure_type: 'simple')
```

#### 2. Create Material (Structured)
```typescript
POST /api/v1/marketplace/teacher/materials
{
  title: string;
  description: string;
  structure_type: 'structured';
  price_credits: number;
  thumbnail_url?: string;
  cover_image_url?: string;
  sessions: [
    {
      session_number: 1;
      title: string;
      description?: string;
      lessons: [
        {
          lesson_number: 1;
          title: string;
          description?: string;
          content_type: 'pdf' | 'video' | ...;
          file_url: string;
          is_preview?: boolean;
          is_free?: boolean;
        }
      ]
    }
  ]
}
// Returns: Material with sessions and lessons
```

#### 3. Get Material Detail
```typescript
GET /api/v1/marketplace/materials/:id

// Response for SIMPLE:
{
  id, title, description, ...
  structure_type: 'simple',
  file_url, preview_url, ...
}

// Response for STRUCTURED:
{
  id, title, description, ...
  structure_type: 'structured',
  thumbnail_url, cover_image_url,
  sessions: [
    {
      id, session_number, title, description,
      is_preview, // Preview session indicator
      lessons: [
        {
          id, lesson_number, title, description,
          content_type, file_url, preview_url,
          is_preview, is_free,
          // Access control: can_access, progress
        }
      ]
    }
  ]
}
```

#### 4. Add Session to Material
```typescript
POST /api/v1/marketplace/teacher/materials/:materialId/sessions
{
  session_number: number;
  title: string;
  description?: string;
  is_preview?: boolean; // Mark session as preview
}
```

#### 5. Add Lesson to Session
```typescript
POST /api/v1/marketplace/teacher/materials/sessions/:sessionId/lessons
{
  lesson_number: number;
  title: string;
  description?: string;
  content_type: 'pdf' | 'video' | ...;
  file_url: string;
  is_preview?: boolean;
  is_free?: boolean;
}
```

#### 6. Get Lesson Content (with access control)
```typescript
GET /api/v1/marketplace/materials/lessons/:lessonId/content

// Returns signed URL if user has access
{
  download_url: string;
  expires_at: Date;
  // OR
  stream_url: string; // for videos
}
```

### Access Control

```typescript
// Check if user can access session
function canAccessSession(userId: string, sessionId: string, materialId: string): boolean {
  const session = getSession(sessionId);
  
  // 1. Check if session is marked as preview
  if (session.is_preview) return true;
  
  // 2. Check if user purchased material
  const purchase = getPurchase(userId, materialId);
  if (!purchase) return false;
  
  // 3. Check if purchase is active
  return purchase.status === 'completed';
}

// Check if user can access lesson
function canAccessLesson(userId: string, lessonId: string, materialId: string): boolean {
  const lesson = getLesson(lessonId);
  const session = getSession(lesson.session_id);
  
  // 1. Check if lesson is free/preview
  if (lesson.is_free || lesson.is_preview) return true;
  
  // 2. Check if parent session is preview
  if (session.is_preview) return true;
  
  // 3. Check if user purchased material
  const purchase = getPurchase(userId, materialId);
  if (!purchase) return false;
  
  // 4. Check if purchase is active
  return purchase.status === 'completed';
}
```

---

## 🎨 FRONTEND UI/UX

### Material Creation Flow

#### Option 1: Simple Material (Quick Upload)
```
[Upload Material Form]
├── Basic Info (title, description, price)
├── Upload File (single file)
└── [Create Material] → SIMPLE structure
```

#### Option 2: Structured Material (Course-like)
```
[Create Structured Material]
├── Step 1: Basic Info
│   ├── Title, Description
│   ├── Thumbnail Upload
│   ├── Cover Image Upload
│   └── Pricing
│
├── Step 2: Sessions & Lessons
│   ├── [Add Session]
│   │   ├── Session Title
│   │   └── [Add Lesson]
│   │       ├── Upload File (PDF/Video/etc.)
│   │       ├── Title, Description
│   │       ├── Preview checkbox
│   │       └── Free checkbox
│   │
│   └── [Add Another Session]
│
└── Step 3: Review & Publish
```

### Material View Page

#### Simple Material (Current UI)
```
[Material Detail Page]
├── Cover Image
├── Title, Description
├── Teacher Info
├── Price, Rating
├── [Download] button
└── Reviews
```

#### Structured Material (Course-like UI)
```
[Material Detail Page]
├── Cover Image/Thumbnail
├── Title, Description
├── Teacher Info
├── Price, Rating
│
├── [Sessions Tabs]
│   ├── Session 1: "Introduction" [Preview Badge] ✅
│   │   ├── Lesson 1: "Overview" [✓ Preview]
│   │   ├── Lesson 2: "Getting Started" [✓ Preview]
│   │   └── Lesson 3: "Advanced" [✓ Preview]
│   │
│   ├── Session 2: "Practice" 🔒
│   │   ├── Lesson 1: "Practice 1" [🔒 Locked]
│   │   └── Lesson 2: "Practice 2" [🔒 Locked]
│   │
│   └── Session 3: "Advanced" 🔒
│       └── ...
│
├── [Buy Now] button (if not purchased)
└── Reviews
```

#### Lesson Viewer (After Purchase)
```
[Lesson Viewer]
├── [Back to Material] button
├── Lesson Title
├── [PDF Viewer] / [Video Player] / [Audio Player]
├── Progress: [Completed] checkbox
├── [Next Lesson] button
└── [Previous Lesson] button
```

---

## 🔄 MATERIAL LIFECYCLE MANAGEMENT

### Nguyên lý cốt lõi: "Quyền sở hữu bất biến"

**Nguyên tắc vàng trong Marketplace giáo dục:**
> "Học viên mua quyền truy cập nội dung, không phải mua sự hiện diện của nội dung trên chợ."

Dù Teacher có thao tác gì (Xóa, Ẩn, Sửa), Students đã trả tiền (Complete Purchase) **bắt buộc vẫn phải truy cập được nội dung họ đã mua**. Dữ liệu chỉ thực sự bị xóa khỏi database khi không còn ai sở hữu nó.

### Publish Material

#### Current Status
- ❌ Publish functionality not implemented
- Materials are created as drafts (`is_published: false`)
- Need to add publish/unpublish endpoints

#### Implementation

```typescript
// Publish Material
PUT /api/v1/marketplace/teacher/materials/:id/publish

// Validation before publishing:
async function canPublishMaterial(materialId: string): Promise<{canPublish: boolean, reason?: string}> {
  const material = await getMaterial(materialId);
  
  // 1. Check if already published
  if (material.is_published) {
    return { canPublish: false, reason: 'Material is already published' };
  }
  
  // 2. Validate required fields
  if (!material.title || !material.description) {
    return { canPublish: false, reason: 'Title and description are required' };
  }
  
  // 3. For simple materials: check file_url
  if (material.structure_type === 'simple' && !material.file_url) {
    return { canPublish: false, reason: 'File is required' };
  }
  
  // 4. For structured materials: check at least 1 session with 1 lesson
  if (material.structure_type === 'structured') {
    const sessions = await getSessions(materialId);
    if (sessions.length === 0) {
      return { canPublish: false, reason: 'At least one session is required' };
    }
    
    for (const session of sessions) {
      const lessons = await getLessons(session.id);
      if (lessons.length === 0) {
        return { canPublish: false, reason: `Session "${session.title}" must have at least one lesson` };
      }
    }
  }
  
  // 5. Check price
  if (material.price_credits < 0) {
    return { canPublish: false, reason: 'Price cannot be negative' };
  }
  
  return { canPublish: true };
}
```

### Edit Material

#### Current Status
- ❌ Edit functionality not fully implemented
- Need proper update endpoints and validation

#### Implementation Strategy

**Quy tắc chỉnh sửa:**
- ✅ **Can edit**: title, description, price (for future purchases), thumbnail, cover image
- ⚠️ **Cannot edit**: `structure_type` (after creation)
- ⚠️ **Cannot delete**: Sessions/Lessons nếu Material đã có người mua
- ✅ **Can add**: Thêm sessions/lessons mới
- ✅ **Can replace**: Thay thế file nội dung (update file_url)

#### Edit Restrictions for Published Materials with Purchases

```typescript
async function canEditMaterial(materialId: string, userId: string): Promise<{canEdit: boolean, restrictions: string[]}> {
  const material = await getMaterial(materialId);
  const purchaseCount = await getPurchaseCount(materialId);
  
  const restrictions: string[] = [];
  let canEdit = true;
  
  if (material.is_published && purchaseCount > 0) {
    // Material has been purchased - restrict certain edits
    restrictions.push('Cannot change structure_type');
    restrictions.push('Cannot delete sessions/lessons that users have access to');
    restrictions.push('Cannot remove content that users have purchased');
    
    // Still allow:
    // - Title/description updates
    // - Price updates (for future purchases only)
    // - Adding new sessions/lessons
    // - Thumbnail/cover image updates
    // - Replacing file content (update file_url)
  }
  
  return { canEdit, restrictions };
}
```

#### Delete Lesson/Session Strategy

**Quy tắc:** Không được xóa Lesson/Session nếu Material đó đã có người mua.

**Giải pháp:** Chỉ cho phép "Disable/Hide" Lesson đó.

```typescript
// Thêm field is_disabled vào material_lessons và material_sessions
ALTER TABLE material_lessons ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE material_sessions ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE;

async function deleteLesson(lessonId: string, userId: string): Promise<void> {
  const lesson = await getLesson(lessonId);
  const material = await getMaterial(lesson.material_id);
  const purchaseCount = await getPurchaseCount(material.id);
  
  // Verify ownership
  if (material.teacher_id !== userId) {
    throw new ForbiddenException();
  }
  
  if (purchaseCount > 0) {
    // Material has purchases: Only allow disable, not delete
    throw new BadRequestException(
      'Cannot delete this lesson because the material has been purchased by students. ' +
      'You can only hide it or replace the content file.'
    );
    
    // Alternative: Auto-disable instead of throwing error
    // await this.repository.update(lessonId, { is_disabled: true });
  } else {
    // No purchases: Safe to delete
    await this.repository.delete(lessonId);
    await this.storageService.deleteFile(lesson.file_url);
  }
}
```

**UI/UX Warning:**
Khi Teacher cố xóa một Lesson trong Material đã bán, hiện thông báo:
> "Không thể xóa bài học này vì đã có học viên. Bạn chỉ có thể ẩn nó đi hoặc thay thế nội dung file mới."

### Chiến lược 3 Trạng thái (The 3-State Strategy)

Thay vì chỉ có "Xóa" hoặc "Không cho xóa", chia hành động của Teacher thành các mức độ rõ ràng:

#### Trường hợp A: Material chưa có ai mua (0 Sales)

**Hành động:** Cho phép **Hard Delete** (Xóa vĩnh viễn).

**Lý do:** Không ảnh hưởng đến ai. Dọn sạch rác database và storage.

#### Trường hợp B: Material đã có người mua (> 0 Sales)

Đây là trọng tâm. **KHÔNG cho phép Hard Delete**. Teacher sẽ có **2 lựa chọn**:

##### 1. Unpublish (Ngừng kinh doanh)

**Hành vi:** Material chuyển trạng thái `is_published: false`.

**Kết quả:**
- ✅ Material biến mất khỏi trang "Chợ" (Marketplace). Người mới không tìm thấy và không mua được.
- ✅ Teacher vẫn nhìn thấy trong trang quản lý (Dashboard) của mình (có tag "Draft" hoặc "Unpublished").
- ✅ Student đã mua vẫn vào học bình thường.

**Use case:** Teacher muốn tạm dừng bán để sửa nội dung, hoặc không muốn nhận thêm học viên mới nhưng vẫn muốn quản lý lớp cũ.

##### 2. Discontinue / Archive (Ngừng cung cấp & Lưu trữ) - Đây là tính năng "Xóa" theo góc nhìn Teacher

**Hành vi:** Teacher nhấn nút "Delete". Hệ thống kiểm tra thấy có người mua → Chuyển sang chế độ **Soft Delete (Discontinue)**.

**Kết quả:**
- ✅ **Với Teacher:** Material biến mất khỏi danh sách quản lý chính (hoặc chuyển vào tab "Thùng rác/Lưu trữ"). Teacher cảm thấy như đã xóa xong.
- ✅ **Với Marketplace:** Biến mất hoàn toàn (như Unpublish).
- ✅ **Với Student cũ:** Material vẫn hiển thị trong trang "My Learning" của họ và truy cập bình thường.

**Cảnh báo UI:** Khi Teacher nhấn Xóa, hiện popup:
> "Material này đang có **15 học viên**. Hành động này sẽ ngừng bán và ẩn khỏi danh sách của bạn, nhưng học viên cũ vẫn có quyền truy cập. Bạn có chắc chắn không?"

### Implementation: Delete Material Logic

#### Database Schema

```sql
-- Thêm status: 'discontinued' (ngừng cung cấp nhưng giữ cho user cũ)
ALTER TABLE materials 
  ADD COLUMN deleted_at TIMESTAMP NULL,
  MODIFY COLUMN status ENUM('draft', 'published', 'archived', 'discontinued', 'deleted') DEFAULT 'draft';

ALTER TABLE materials ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE materials ADD INDEX idx_status (status);
```

#### Logic API: DELETE /materials/:id

```typescript
enum MaterialStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DISCONTINUED = 'discontinued', // Soft delete - ngừng cung cấp nhưng giữ cho user cũ
  DELETED = 'deleted', // Hard delete (chỉ dùng cho cleanup job)
}

async function deleteMaterial(materialId: string, userId: string): Promise<void> {
  const material = await getMaterial(materialId);
  
  // 1. Validate chủ sở hữu
  if (material.teacher_id !== userId) {
    throw new ForbiddenException('Only material owner can delete');
  }

  const purchaseCount = await getPurchaseCount(materialId);

  // 2. Logic phân nhánh
  if (purchaseCount === 0) {
    // CASE A: Chưa ai mua -> Xóa sạch (Hard Delete)
    // Xóa file trên storage
    await this.storageService.deleteFiles(material);
    // Xóa database record
    await this.repository.delete(materialId);
    return;
  }

  // CASE B: Đã có người mua -> Soft Delete (Discontinue)
  // Chỉ cập nhật trạng thái, KHÔNG xóa data
  await this.repository.update(materialId, {
    status: MaterialStatus.DISCONTINUED,  // Đánh dấu là đã ngừng cung cấp
    deleted_at: new Date(),                // Đánh dấu thời gian xóa (để Teacher không thấy nữa)
    is_published: false                    // Ngừng bán ngay lập tức
  });
  
  // Lưu ý: KHÔNG xóa file vật lý!
  // Lưu ý: KHÔNG xóa database record!
  
  this.logger.log(`Material ${materialId} discontinued by ${userId} (has ${purchaseCount} purchases)`);
}
```

#### Logic API: GET /marketplace/materials (Public Listing)

```typescript
// Query: Chỉ hiển thị materials published và chưa bị discontinued
async function getPublicMaterials(): Promise<Material[]> {
  return await this.repository.find({
    where: {
      is_published: true,
      deleted_at: IsNull(),  // Không hiển thị materials đã bị discontinued
      status: Not(MaterialStatus.DISCONTINUED)
    }
  });
}
```

#### Logic API: GET /my-learning (Student View)

```typescript
// Query: Join bảng purchases - QUAN TRỌNG: Không được lọc theo deleted_at
async function getMyPurchasedMaterials(userId: string): Promise<Material[]> {
  return await this.purchaseRepository
    .createQueryBuilder('purchase')
    .leftJoinAndSelect('purchase.material', 'material')
    .where('purchase.user_id = :userId', { userId })
    .andWhere('purchase.status = :status', { status: 'completed' })
    // QUAN TRỌNG: Không filter theo material.deleted_at
    // Kể cả material có deleted_at vẫn hiện ra cho student đã mua
    .getMany()
    .then(purchases => purchases.map(p => p.material));
}
```

#### Logic API: GET /teacher/materials (Teacher Dashboard)

```typescript
// Query: Teacher thấy tất cả materials của mình, TRỪ những cái đã discontinued
async function getTeacherMaterials(teacherId: string): Promise<Material[]> {
  return await this.repository.find({
    where: {
      teacher_id: teacherId,
      deleted_at: IsNull()  // Ẩn materials đã discontinued khỏi danh sách chính
    }
  });
  
  // Hoặc có thể tách ra tab riêng "Archived/Discontinued"
  async function getTeacherDiscontinuedMaterials(teacherId: string): Promise<Material[]> {
    return await this.repository.find({
      where: {
        teacher_id: teacherId,
        status: MaterialStatus.DISCONTINUED
      }
    });
  }
}
```

#### Restore Functionality

```typescript
async function restoreMaterial(materialId: string, userId: string): Promise<Material> {
  const material = await this.getOne(materialId);
  
  if (material.teacher_id !== userId) {
    throw new ForbiddenException();
  }
  
  if (material.status !== MaterialStatus.DISCONTINUED && material.status !== MaterialStatus.ARCHIVED) {
    throw new BadRequestException('Material is not discontinued or archived');
  }
  
  return await this.repository.update(materialId, {
    status: MaterialStatus.DRAFT,
    deleted_at: null,
    // Note: is_published vẫn false, teacher cần publish lại
  });
}
```

#### API Endpoints for Material Management

```typescript
// Publish/Unpublish
PUT /api/v1/marketplace/teacher/materials/:id/publish
PUT /api/v1/marketplace/teacher/materials/:id/unpublish

// Edit
PUT /api/v1/marketplace/teacher/materials/:id
PATCH /api/v1/marketplace/teacher/materials/:id

// Delete/Restore (The 3-State Strategy)
DELETE /api/v1/marketplace/teacher/materials/:id
  // Case A: 0 sales → Hard delete
  // Case B: >0 sales → Soft delete (discontinued)
POST /api/v1/marketplace/teacher/materials/:id/restore
  // Restore from discontinued/archived status

// Archive
POST /api/v1/marketplace/teacher/materials/:id/archive

// Teacher Dashboard - Get discontinued materials
GET /api/v1/marketplace/teacher/materials/discontinued
```

### UI/UX Implementation

#### Teacher Dashboard - Material List

```
[Teacher Materials Dashboard]
├── [Active Materials] Tab
│   ├── Material 1 [Published] [Edit] [Unpublish] [Delete]
│   ├── Material 2 [Draft] [Edit] [Publish] [Delete]
│   └── Material 3 [Unpublished] [Edit] [Publish] [Delete]
│
├── [Discontinued/Archived] Tab
│   ├── Material 4 [Discontinued - 15 students] [Restore]
│   └── Material 5 [Archived] [Restore]
│
└── [Trash] Tab (Optional - for hard deleted items)
```

#### Delete Confirmation Dialog

```
┌─────────────────────────────────────────────────┐
│ ⚠️ Xác nhận xóa Material                        │
├─────────────────────────────────────────────────┤
│                                                  │
│ Material: "Advanced Python Course"              │
│                                                  │
│ ⚠️ Material này đang có 15 học viên.           │
│                                                  │
│ Hành động này sẽ:                                │
│ • Ngừng bán material này                        │
│ • Ẩn khỏi danh sách quản lý của bạn             │
│ • Ẩn khỏi Marketplace                           │
│                                                  │
│ ✅ Học viên cũ vẫn có quyền truy cập            │
│                                                  │
│ [Hủy]  [Xác nhận xóa]                           │
└─────────────────────────────────────────────────┘
```

#### Student View - My Learning

```
[My Learning Page]
├── Material 1 [Active] [Continue Learning]
├── Material 2 [Active] [Continue Learning]
└── Material 3 [Discontinued by Teacher] [Still Accessible] [Continue Learning]
    └── Note: "Material này đã ngừng bán, nhưng bạn vẫn có quyền truy cập"
```

### Cleanup Strategy

**Cleanup Job:** Tự động xóa materials đã discontinued sau 1 năm (sau khi thông báo cho purchasers).

```typescript
// Cron job: Chạy mỗi tháng
async function cleanupOldDiscontinuedMaterials(): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const oldMaterials = await this.repository.find({
    where: {
      status: MaterialStatus.DISCONTINUED,
      deleted_at: LessThan(oneYearAgo)
    }
  });
  
  for (const material of oldMaterials) {
    // 1. Thông báo cho tất cả purchasers (email/notification)
    await this.notifyPurchasers(material.id, 'Material will be removed in 30 days');
    
    // 2. Đợi 30 ngày, sau đó hard delete
    // (Hoặc chuyển sang status DELETED và xóa file sau khi đảm bảo không còn ai truy cập)
  }
}
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Database & Entities (Week 1)

#### Tasks
- [ ] Create migration for new columns in `materials` (structure_type, thumbnail_url, cover_image_url, deleted_at, status)
- [ ] Create `MaterialSession` entity (with `is_preview` flag)
- [ ] Create `MaterialLesson` entity
- [ ] Create `MaterialPurchaseLesson` entity (progress tracking)
- [ ] Update `Material` entity with new fields
- [ ] Write migration scripts

#### Files to create
```
talkplatform-backend/src/features/marketplace/entities/
  ├── material-session.entity.ts
  ├── material-lesson.entity.ts
  └── material-purchase-lesson.entity.ts

talkplatform-backend/src/database/migrations/
  └── XXX_MaterialCourseStructure.ts
```

### Phase 2: Backend Services (Week 2)

#### Tasks
- [ ] Update `MaterialService` to support structured materials
- [ ] Create `MaterialSessionService`
- [ ] Create `MaterialLessonService`
- [ ] Update `MaterialService.create()` to handle both simple and structured
- [ ] Implement access control for lessons
- [ ] Update `MaterialService.getOne()` to include sessions/lessons

#### Services
```typescript
MaterialService {
  create(dto: CreateMaterialDto): Material
  createStructured(dto: CreateStructuredMaterialDto): Material
  addSession(materialId, dto): MaterialSession
  addLesson(sessionId, dto): MaterialLesson
  getOne(id, userId?): Material (with access control)
}

MaterialSessionService {
  create(materialId, dto): MaterialSession
  update(id, dto): MaterialSession
  delete(id): void
  reorder(materialId, sessionIds): void
}

MaterialLessonService {
  create(sessionId, dto): MaterialLesson
  update(id, dto): MaterialLesson
  delete(id): void
  getContent(lessonId, userId): SignedUrl
  markComplete(purchaseId, lessonId): void
}
```

### Phase 3: API Controllers (Week 2-3)

#### Tasks
- [ ] Update `MaterialController`
- [ ] Create `MaterialSessionController`
- [ ] Create `MaterialLessonController`
- [ ] Add DTOs for structured materials
- [ ] Update validation

#### Endpoints
```
POST   /marketplace/teacher/materials
GET    /marketplace/materials/:id
POST   /marketplace/teacher/materials/:id/sessions
PUT    /marketplace/teacher/materials/sessions/:id
DELETE /marketplace/teacher/materials/sessions/:id
POST   /marketplace/teacher/materials/sessions/:id/lessons
PUT    /marketplace/teacher/materials/lessons/:id
DELETE /marketplace/teacher/materials/lessons/:id
GET    /marketplace/materials/lessons/:id/content
POST   /marketplace/materials/lessons/:id/complete
```

### Phase 4: Frontend - Material Creation (Week 3-4)

#### Tasks
- [ ] Create `CreateStructuredMaterialPage`
- [ ] Create `MaterialSessionForm` component
- [ ] Create `MaterialLessonForm` component
- [ ] Update `UploadMaterialForm` to support both modes
- [ ] Add thumbnail/cover image upload

#### Components
```
components/marketplace/
  ├── create-structured-material-form.tsx
  ├── material-session-editor.tsx
  ├── material-lesson-editor.tsx
  └── material-thumbnail-upload.tsx
```

### Phase 5: Frontend - Material View (Week 4-5)

#### Tasks
- [ ] Update `MaterialDetailPage` to detect structure type
- [ ] Create `StructuredMaterialView` component
- [ ] Create `MaterialSessionTabs` component
- [ ] Create `MaterialLessonList` component
- [ ] Create `LessonViewer` component (PDF/Video/Audio)
- [ ] Implement progress tracking UI

#### Pages/Components
```
app/marketplace/[id]/
  └── page.tsx (updated)

components/marketplace/
  ├── structured-material-view.tsx
  ├── material-session-tabs.tsx
  ├── material-lesson-list.tsx
  └── lesson-viewer/
      ├── pdf-viewer.tsx
      ├── video-player.tsx
      └── audio-player.tsx
```

### Phase 6: Progress Tracking (Week 5)

#### Tasks
- [ ] Implement lesson completion tracking
- [ ] Update `MaterialPurchaseService` to track progress
- [ ] Create progress API endpoints
- [ ] Add progress UI (checkmarks, progress bar)

### Phase 7: Material Lifecycle Management (Week 6)

#### Tasks
- [ ] Implement publish/unpublish functionality
- [ ] Implement edit with restrictions
- [ ] Implement soft delete for materials with purchases
- [ ] Add archive functionality
- [ ] Create restore endpoint
- [ ] Add cleanup job for old soft-deleted materials
- [ ] Update UI for publish/edit/delete actions

#### Implementation Details
- [ ] Add `deleted_at` and `status` columns to materials table
- [ ] Update `MaterialService` with lifecycle methods
- [ ] Add validation for publish/edit operations
- [ ] Implement access control for purchased materials
- [ ] Create cleanup cron job

### Phase 8: Testing & Polish (Week 7)

#### Tasks
- [ ] Write unit tests for new services
- [ ] Write integration tests for APIs
- [ ] Test backward compatibility (simple materials)
- [ ] Test preview sessions feature
- [ ] Test lifecycle management (publish/edit/delete)
- [ ] UI/UX polish
- [ ] Performance optimization
- [ ] Documentation

---

## 🔄 MIGRATION STRATEGY

### Backward Compatibility

#### Approach 1: Dual Mode Support
- Keep existing `file_url` for simple materials
- Add new tables for structured materials
- `MaterialService` handles both types

```typescript
class MaterialService {
  async getOne(id: string, userId?: string) {
    const material = await this.repository.findOne(id);
    
    if (material.structure_type === 'simple') {
      // Return existing format
      return material;
    } else {
      // Load sessions and lessons
      material.sessions = await this.sessionService.findByMaterial(id);
      for (const session of material.sessions) {
        session.lessons = await this.lessonService.findBySession(session.id);
        // Add access control info
        if (userId) {
          for (const lesson of session.lessons) {
            lesson.can_access = await this.canAccess(userId, lesson.id);
          }
        }
      }
      return material;
    }
  }
}
```

#### Migration Steps

1. **Phase 1: Add new columns (non-breaking)**
   ```sql
   ALTER TABLE materials ADD COLUMN structure_type ENUM('simple', 'structured') DEFAULT 'simple';
   ALTER TABLE materials ADD COLUMN thumbnail_url VARCHAR(500) NULL;
   ALTER TABLE materials ADD COLUMN cover_image_url VARCHAR(500) NULL;
   ALTER TABLE materials ADD COLUMN deleted_at TIMESTAMP NULL;
   ALTER TABLE materials ADD COLUMN status ENUM('draft', 'published', 'archived', 'discontinued', 'deleted') DEFAULT 'draft';
   
   -- Thêm is_disabled cho lessons và sessions (để disable thay vì delete)
   ALTER TABLE material_lessons ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE;
   ALTER TABLE material_sessions ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE;
   ```

2. **Phase 2: Create new tables**
   ```sql
   CREATE TABLE material_sessions (...);
   CREATE TABLE material_lessons (...);
   ```

3. **Phase 3: Deploy new code (backward compatible)**
   - Old materials continue to work
   - New structured materials can be created

4. **Phase 4: Migrate existing materials (optional)**
   - Convert simple materials to structured (1 session, 1 lesson)
   - Or keep as simple

---

## 🧪 TESTING STRATEGY

### Unit Tests

```typescript
describe('MaterialService', () => {
  describe('createStructured', () => {
    it('should create material with sessions and lessons', async () => {
      // Test structured material creation
    });
  });
  
  describe('getOne', () => {
    it('should return simple material format for simple materials', async () => {
      // Test backward compatibility
    });
    
    it('should return structured format with sessions/lessons', async () => {
      // Test new structure
    });
  });
});

describe('MaterialLessonService', () => {
  describe('getContent', () => {
    it('should return signed URL for purchased users', async () => {
      // Test access control
    });
    
    it('should allow preview for free lessons', async () => {
      // Test preview access
    });
    
    it('should allow access to lessons in preview sessions', async () => {
      // Test preview session access
    });
  });
});
```

### Integration Tests

```typescript
describe('Material API', () => {
  it('POST /materials - create simple material', async () => {
    // Test simple creation
  });
  
  it('POST /materials - create structured material', async () => {
    // Test structured creation
  });
  
  it('GET /materials/:id - should return correct format', async () => {
    // Test response format
  });
});
```

### E2E Tests

```typescript
describe('Material Creation Flow', () => {
  it('Teacher can create structured material', async () => {
    // 1. Login as teacher
    // 2. Navigate to create material
    // 3. Fill in basic info
    // 4. Add sessions and lessons
    // 5. Upload files
    // 6. Publish
    // 7. Verify material is visible
  });
  
  it('Student can purchase and access lessons', async () => {
    // 1. View structured material
    // 2. Purchase material
    // 3. Access lessons
    // 4. Mark lessons as complete
  });
  
  it('Student can access discontinued material', async () => {
    // 1. Purchase material
    // 2. Teacher discontinues material
    // 3. Student can still access via "My Learning"
    // 4. Material not visible in marketplace
  });
  
  it('Teacher cannot delete lesson with purchases', async () => {
    // 1. Create material with lesson
    // 2. Student purchases
    // 3. Teacher tries to delete lesson
    // 4. Should show error or auto-disable
  });
});
```

---

## ⏱️ TIMELINE & EFFORT ESTIMATION

### Timeline: 7 weeks

| Phase | Duration | Tasks | Effort (hours) |
|-------|----------|-------|----------------|
| Phase 1: Database | 1 week | Migrations, Entities | 16h |
| Phase 2: Backend Services | 1 week | Services, Logic | 24h |
| Phase 3: API Controllers | 1 week | Controllers, DTOs | 16h |
| Phase 4: Frontend Creation | 1.5 weeks | Forms, Uploads | 32h |
| Phase 5: Frontend View | 1.5 weeks | Viewers, UI | 32h |
| Phase 6: Progress Tracking | 0.5 week | Tracking, API | 8h |
| Phase 7: Lifecycle Management | 1 week | Publish/Edit/Delete | 16h |
| Phase 8: Testing & Polish | 1 week | Tests, Docs | 24h |

**Total: ~168 hours (~4.5 weeks full-time)**

### Team Size Recommendation
- **Backend Developer**: 1 (Phases 1-3, 6)
- **Frontend Developer**: 1 (Phases 4-5)
- **QA/Testing**: 0.5 (Phase 7)

---

## ✅ ACCEPTANCE CRITERIA

### Must Have
- [x] Materials can be created as simple (backward compatible)
- [x] Materials can be created with sessions and lessons
- [x] Students can purchase and access structured materials
- [x] Lesson access control works correctly
- [x] Progress tracking works
- [x] UI is intuitive and matches Course UI patterns

### Should Have
- [x] Thumbnail/cover image upload
- [ ] Lesson reordering
- [ ] Bulk lesson upload
- [x] Preview sessions for non-purchasers
- [x] Preview lessons for non-purchasers
- [x] Publish/Unpublish functionality
- [x] Edit material functionality
- [x] Delete material with purchase protection (soft delete)

### Nice to Have
- [ ] Drag-and-drop lesson ordering
- [ ] Lesson templates
- [ ] Analytics per lesson
- [ ] Download all lessons as ZIP

---

## 🚀 NEXT STEPS

1. **Review this proposal** with team
2. **Approve architecture** and timeline
3. **Create detailed tickets** for each phase
4. **Start Phase 1** (Database & Entities)
5. **Schedule regular reviews** (weekly)

---

## 📚 REFERENCES

- Course Management Implementation: `docs/courses/`
- Current Material System: `talkplatform-backend/src/features/marketplace/`
- Phase 3 Documentation: `docs/Phase3_Marketplace_Enhancement/`

---

**Document Version**: 1.2  
**Created**: 2025-12-06  
**Last Updated**: 2025-12-06  
**Author**: AI Assistant  
**Status**: Proposal (Approved - Ready for Implementation)

### Changelog

**v1.2 (2025-12-06)**
- ✅ **MAJOR UPDATE:** Implemented "The 3-State Strategy" for Material Lifecycle
- ✅ Added core principle: "Quyền sở hữu bất biến" (Immutable Ownership)
- ✅ Implemented Case A: 0 Sales → Hard Delete
- ✅ Implemented Case B: >0 Sales → 2 options (Unpublish / Discontinue)
- ✅ Added `discontinued` status to database schema
- ✅ Updated delete logic with proper query filters for public/student/teacher views
- ✅ Added lesson/session delete restrictions (disable instead of delete)
- ✅ Added comprehensive UI/UX guidelines for delete confirmation dialogs
- ✅ Added cleanup strategy for old discontinued materials
- ✅ Updated migration plan with `is_disabled` fields
- ✅ Updated testing strategy with new test cases

**v1.1 (2025-12-06)**
- ✅ Added preview sessions feature (`is_preview` flag on sessions)
- ✅ Added Material Lifecycle Management section
- ✅ Added publish/unpublish functionality proposal
- ✅ Added edit restrictions for materials with purchases
- ✅ Added comprehensive delete strategy (soft delete recommended)
- ✅ Updated access control logic to support preview sessions
- ✅ Updated Phase 7 with lifecycle management tasks
- ✅ Extended timeline to 7 weeks

