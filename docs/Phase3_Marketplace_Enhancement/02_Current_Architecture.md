# PHASE 3: MARKETPLACE ENHANCEMENT - KIẾN TRÚC HIỆN TẠI

**Ngày tạo:** 06/12/2025  
**Trạng thái:** ✅ ĐANG HOẠT ĐỘNG  
**Độ hoàn thiện:** 75%

---

## 🏗️ TỔNG QUAN KIẾN TRÚC

### Backend Architecture

```
talkplatform-backend/src/features/
├── marketplace/
│   ├── entities/
│   │   ├── material.entity.ts              ✅ Core entity
│   │   ├── material-purchase.entity.ts     ✅ Purchase tracking
│   │   ├── material-review.entity.ts       ✅ Reviews
│   │   └── material-category.entity.ts     ✅ Categories
│   ├── services/
│   │   ├── material.service.ts             ✅ Business logic
│   │   └── upload.service.ts               ✅ File handling
│   ├── controllers/
│   │   ├── teacher-material.controller.ts  ✅ Teacher endpoints
│   │   ├── student-material.controller.ts  ✅ Student endpoints
│   │   └── admin-material.controller.ts    ✅ Admin endpoints
│   ├── dto/
│   │   ├── create-material.dto.ts          ✅ Validation
│   │   ├── update-material.dto.ts          ✅ Validation
│   │   └── filter-material.dto.ts          ✅ Search filters
│   └── marketplace.module.ts               ✅ Module config
│
├── wallet/
│   ├── wallet.service.ts                   ✅ Double-entry ledger
│   └── entities/
│       ├── ledger-transaction.entity.ts    ✅ Transaction log
│       └── ledger-entry.entity.ts          ✅ Entry log
│
└── courses/
    └── entities/
        ├── course.entity.ts                ✅ Course structure
        └── lesson-material.entity.ts       ✅ Lesson attachments
```

### Frontend Architecture

```
talkplatform-frontend/
├── app/
│   ├── marketplace/
│   │   ├── page.tsx                        ✅ Browse materials
│   │   ├── [id]/page.tsx                   ✅ Material detail
│   │   └── my-purchases/page.tsx           ✅ Purchase history
│   └── teacher/
│       └── materials/
│           ├── page.tsx                    ✅ Manage materials
│           └── upload/page.tsx             ✅ Upload form
├── api/
│   └── marketplace.ts                      ✅ API client
└── components/
    └── marketplace/
        └── material-card.tsx               ✅ Material card UI
```

---

## 📊 DATABASE SCHEMA

### 1. Materials Table

```sql
CREATE TABLE materials (
    id CHAR(36) PRIMARY KEY,
    teacher_id CHAR(36) NOT NULL,
    category_id CHAR(36),
    
    -- Content Info
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    material_type ENUM('pdf', 'video', 'slide', 'audio', 'document', 'course', 'ebook'),
    
    -- Files
    file_url VARCHAR(500) NOT NULL,
    file_size INT,
    preview_url VARCHAR(500),           -- ❌ NOT IMPLEMENTED YET
    thumbnail_url VARCHAR(500),
    
    -- Pricing
    price_credits INT DEFAULT 0,
    original_price_credits INT,
    
    -- Metadata
    language VARCHAR(50),
    level ENUM('beginner', 'intermediate', 'advanced', 'all') DEFAULT 'all',
    tags JSON,
    duration INT,                       -- For videos/audio
    page_count INT,                     -- For PDFs
    
    -- Stats
    download_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INT DEFAULT 0,
    total_sales INT DEFAULT 0,
    total_revenue INT DEFAULT 0,
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP(6),
    
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE SET NULL,
    INDEX idx_teacher (teacher_id),
    INDEX idx_category (category_id),
    INDEX idx_published (is_published),
    INDEX idx_type (material_type)
);
```

### 2. Material Purchases Table

```sql
CREATE TABLE material_purchases (
    id CHAR(36) PRIMARY KEY,
    material_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    
    price_paid INT NOT NULL,
    transaction_id CHAR(36),            -- Link to ledger_transactions
    
    download_count INT DEFAULT 0,
    last_downloaded_at TIMESTAMP(6),
    purchased_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_purchase (material_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_material (material_id)
);
```

### 3. Material Reviews Table

```sql
CREATE TABLE material_reviews (
    id CHAR(36) PRIMARY KEY,
    material_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (material_id, user_id)
);
```

### 4. Ledger Integration (Wallet System)

```sql
-- Double-Entry Ledger cho Material Purchases
CREATE TABLE ledger_transactions (
    id CHAR(36) PRIMARY KEY,
    transaction_group_id CHAR(36) NOT NULL,
    description VARCHAR(1000),
    transaction_type VARCHAR(50),       -- 'material_purchase', 'revenue_sharing'
    reference_id CHAR(36),              -- material_purchase.id
    metadata JSON,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE ledger_entries (
    id CHAR(36) PRIMARY KEY,
    transaction_id CHAR(36) NOT NULL,
    account_id VARCHAR(100) NOT NULL,   -- 'user-{userId}', 'platform', 'escrow'
    entry_type ENUM('debit', 'credit'),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2),
    description VARCHAR(1000),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    FOREIGN KEY (transaction_id) REFERENCES ledger_transactions(id),
    INDEX idx_account (account_id),
    INDEX idx_transaction (transaction_id)
);
```

---

## 🔄 CURRENT WORKFLOWS

### 1. Material Upload Flow

```
Teacher → Upload Form → UploadService.saveFile()
                              ↓
                        Save to /uploads/
                              ↓
                    MaterialService.create()
                              ↓
                    Material (is_published: false)
```

**Implementation:**
- ✅ File upload to local storage (`/uploads/`)
- ✅ Material entity creation
- ✅ Draft mode by default
- ❌ No preview generation
- ❌ No thumbnail auto-generation

### 2. Material Purchase Flow

```
Student → Purchase Button → MaterialService.purchaseMaterial()
                                    ↓
                            Check if already purchased
                                    ↓
                            WalletService.deductCredits()
                                    ↓
                        Create MaterialPurchase record
                                    ↓
                        WalletService.shareRevenue()
                            (Platform 30%, Teacher 70%)
                                    ↓
                            Update material stats
```

**Revenue Sharing Logic:**
```typescript
// Current implementation in material.service.ts (line 245-252)
await this.walletService.shareRevenue(
    material.teacher_id,
    material.price_credits,
    30, // Platform 30%, Teacher 70%
    `Material sale: ${material.title}`,
    savedPurchase.id,
);
```

### 3. Download Flow

```
Student → Download Button → MaterialService.getDownloadUrl()
                                    ↓
                            Check purchase status
                                    ↓
                            Increment download_count
                                    ↓
                            Return file_url
```

**Current Issues:**
- ❌ No signed URL (security risk)
- ❌ Direct file access
- ❌ No expiration time
- ✅ Download tracking works

---

## 💰 REVENUE POLICY

### Current Implementation

| Stakeholder | Share | Implementation Status |
|------------|-------|----------------------|
| **Platform** | 30% | ✅ Implemented |
| **Teacher** | 70% | ✅ Implemented |

**Code Reference:**
```typescript
// talkplatform-backend/src/features/wallet/wallet.service.ts (line 318-358)
async shareRevenue(
    teacherId: string,
    totalAmount: number,
    platformPercentage: number,
    description: string,
    referenceId?: string,
): Promise<LedgerTransaction> {
    const teacherAccountId = `user-${teacherId}`;
    const platformAmount = (totalAmount * platformPercentage) / 100;
    const teacherAmount = totalAmount - platformAmount;

    return await this.createTransaction([
        {
            account_id: 'escrow',
            entry_type: EntryType.DEBIT,
            amount: totalAmount,
            description: `Revenue sharing for ${description}`,
        },
        {
            account_id: 'platform',
            entry_type: EntryType.CREDIT,
            amount: platformAmount,
            description: `Platform fee (${platformPercentage}%)`,
        },
        {
            account_id: teacherAccountId,
            entry_type: EntryType.CREDIT,
            amount: teacherAmount,
            description: `Teacher earnings (${100 - platformPercentage}%)`,
        },
    ], description, 'revenue_sharing', referenceId);
}
```

---

## 🎯 CURRENT FEATURES STATUS

### ✅ Implemented Features

1. **Material Management**
   - Create, Read, Update, Delete materials
   - Draft/Published status
   - Category assignment
   - Tag system

2. **Purchase System**
   - Credit-based payment
   - Purchase validation (no duplicate)
   - Purchase history tracking
   - Download tracking

3. **Revenue Sharing**
   - Double-entry ledger system
   - Automatic 70/30 split
   - Transaction logging
   - Balance tracking

4. **Search & Filter**
   - Full-text search
   - Filter by type, level, category
   - Sort by newest, popular, rating, price
   - Pagination

5. **Reviews & Ratings**
   - 5-star rating system
   - Text reviews
   - Average rating calculation

### ❌ Missing Features (Phase 3 Goals)

1. **Preview Generation**
   - Auto-generate PDF preview (first 3 pages)
   - Video thumbnail extraction
   - Preview watermarking

2. **Signed URLs**
   - Time-limited download links (15 minutes)
   - Secure file access
   - Download tracking with expiration

3. **Revenue Dashboard**
   - Total revenue analytics
   - Platform fee breakdown
   - Teacher earnings summary
   - Sales charts

4. **Analytics**
   - Sales trends
   - Popular materials
   - Revenue over time
   - Download statistics

---

## 🔐 SECURITY CONSIDERATIONS

### Current Security

✅ **Implemented:**
- JWT authentication for all endpoints
- Role-based access control (Teacher/Student/Admin)
- Purchase validation before download
- SQL injection protection (TypeORM)

❌ **Missing:**
- Signed URLs for downloads
- File access rate limiting
- Preview watermarking
- Download link expiration

---

## 📈 PERFORMANCE CONSIDERATIONS

### Current Optimizations

✅ **Database:**
- Indexes on teacher_id, category_id, is_published
- Eager loading for teacher/category relations
- Pagination for large result sets

✅ **File Storage:**
- Local file system (fast for small scale)
- Direct file serving

❌ **Needs Improvement:**
- No CDN integration
- No file compression
- No caching strategy
- No preview pre-generation

---

**Next:** `03_Revenue_Dashboard.md`
