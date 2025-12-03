# 🗄️ Database Schema Cleanup Analysis

**Version**: 1.0  
**Created**: 2025-11-27  
**Purpose**: Phân tích và loại bỏ các trường không cần thiết trong database

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Meetings Table Analysis](#meetings-table-analysis)
3. [All Tables Analysis](#all-tables-analysis)
4. [Recommended Actions](#recommended-actions)
5. [Migration Scripts](#migration-scripts)

---

## 📋 Overview

### Current Database Tables (42 tables)

```
Core Tables:
- users
- meetings
- meeting_participants
- meeting_chat_messages

Course System:
- courses
- course_sessions
- course_enrollments
- lessons
- lesson_materials
- session_materials
- session_purchases
- payment_holds

Teacher System:
- teacher_profiles
- teacher_verifications
- teacher_verification_teaching_certificates
- teacher_verification_degree_certificates
- teacher_verification_references
- teacher_availability
- teacher_reviews
- teacher_rankings
- teacher_earnings_summary
- teacher_media

Classroom System (DEPRECATED):
- classrooms
- classroom_members
- classroom_resources
- classroom_announcements

Marketplace:
- materials
- material_categories
- material_purchases
- material_reviews
- material_review_helpful
- material_sales_summary

Credits & Payments:
- credit_packages
- credit_transactions
- withdrawal_requests
- revenue_shares
- payment_methods

Booking:
- bookings
- booking_slots

Chat & Communication:
- global_chat_messages
- notifications
- email_queue

Metrics & Monitoring:
- livekit_metrics
- livekit_event_details
- bandwidth_metrics
- metrics_hourly
- webhook_events
- meeting_statistics

Matching (DEPRECATED):
- match_history
- user_matching_preferences

Other:
- blocked_participants
- user_activity_logs
- schedules
- ledger_transactions
- ledger_entries
- migrations_typeorm
```

---

## 🔍 Meetings Table Analysis

### Current Fields (42 fields)

```sql
CREATE TABLE meetings (
  -- Core fields (KEEP)
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  host_id VARCHAR(36),
  status ENUM('scheduled','live','ended','cancelled') NOT NULL,
  
  -- Timestamps (KEEP)
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  
  -- Participants (KEEP)
  max_participants INT NOT NULL,
  total_participants INT NOT NULL,
  current_participants INT NOT NULL,
  
  -- Meeting Settings (KEEP)
  settings JSON,
  recording_url VARCHAR(500),
  
  -- YouTube Integration (KEEP - Active Feature)
  youtube_video_id VARCHAR(255),
  youtube_current_time FLOAT NOT NULL,
  youtube_is_playing TINYINT NOT NULL,
  
  -- Course Integration (KEEP - Active Feature)
  lesson_id VARCHAR(36),
  course_id VARCHAR(36),
  session_id VARCHAR(36),
  teacher_name VARCHAR(255),
  subject_name VARCHAR(255),
  
  -- Meeting Type & Pricing (KEEP)
  meeting_type ENUM('free_talk','teacher_class','workshop','private_session') NOT NULL,
  pricing_type ENUM('free','credits','subscription') NOT NULL,
  price_credits INT NOT NULL,
  
  -- Room Configuration (KEEP)
  level ENUM('all','beginner','intermediate','advanced'),
  language VARCHAR(100),
  topic VARCHAR(500),
  region VARCHAR(100),
  tags JSON,
  room_status ENUM('empty','available','crowded','full') NOT NULL,
  
  -- Access Control (KEEP)
  is_private TINYINT NOT NULL,
  is_locked TINYINT NOT NULL,
  requires_approval TINYINT(1) NOT NULL,
  allow_microphone TINYINT(1) NOT NULL,
  participants_can_unmute TINYINT(1) NOT NULL,
  is_audio_first TINYINT(1) NOT NULL,
  blocked_users JSON,
  
  -- DEPRECATED/REDUNDANT Fields (REMOVE)
  is_classroom_only TINYINT(1) NOT NULL,  -- ❌ REMOVE: Classroom deprecated
  classroom_id VARCHAR(36)                 -- ❌ REMOVE: Classroom deprecated
  
  -- KEEP - Active Features
  affiliate_code VARCHAR(500)              -- ✅ KEEP: Used for course affiliate tracking
);
```

---

### ❌ Fields to REMOVE from Meetings

#### 1. **is_classroom_only** (TINYINT)
- **Reason**: Classroom system đã deprecated
- **Impact**: Không còn sử dụng
- **Migration**: DROP COLUMN

#### 2. **classroom_id** (VARCHAR(36))
- **Reason**: Classroom system đã deprecated
- **Impact**: Foreign key to deprecated table
- **Migration**: DROP FOREIGN KEY + DROP COLUMN

---

### ✅ Fields to KEEP in Meetings

#### Core Meeting Fields
- `id`, `title`, `description`, `host_id`, `status`
- `scheduled_at`, `started_at`, `ended_at`
- `created_at`, `updated_at`

#### Participant Management
- `max_participants`, `total_participants`, `current_participants`

#### YouTube Integration (Active Feature)
- `youtube_video_id` - Video ID đang phát
- `youtube_current_time` - Thời gian hiện tại
- `youtube_is_playing` - Trạng thái play/pause

#### Course Integration (Active Feature)
- `lesson_id` - Link to lessons table
- `course_id` - Link to courses table
- `session_id` - Link to course_sessions table
- `teacher_name` - Tên teacher (denormalized for performance)
- `subject_name` - Tên môn học (denormalized for performance)

#### Meeting Configuration
- `meeting_type` - free_talk, teacher_class, workshop, private_session
- `pricing_type` - free, credits, subscription
- `price_credits` - Giá credits
- `level` - all, beginner, intermediate, advanced
- `language` - Ngôn ngữ
- `topic` - Chủ đề
- `region` - Khu vực
- `tags` - Tags
- `room_status` - empty, available, crowded, full

#### Access Control
- `is_private` - Phòng riêng tư
- `is_locked` - Phòng đã khóa
- `requires_approval` - Cần phê duyệt
- `allow_microphone` - Cho phép mic
- `participants_can_unmute` - Participants có thể unmute
- `is_audio_first` - Audio-first mode
- `blocked_users` - Danh sách users bị block

#### Other
- `settings` - JSON settings
- `recording_url` - URL recording
- `affiliate_code` - Mã affiliate cho course tracking (COURSE_MIFT...)

---

## 📊 All Tables Analysis

### 1. ❌ **DEPRECATED Tables - REMOVE COMPLETELY**

#### Classroom System (4 tables)
```sql
-- These tables are no longer used after restructure
DROP TABLE classroom_announcements;
DROP TABLE classroom_resources;
DROP TABLE classroom_members;
DROP TABLE classrooms;
```

**Reason**: Classroom system đã được thay thế bằng Meeting-based system

**Impact**: 
- Không còn code reference
- Không còn data quan trọng (nếu có thì migrate sang meetings)

---

#### Matching System (2 tables)
```sql
-- Old matching system, not used anymore
DROP TABLE match_history;
DROP TABLE user_matching_preferences;
```

**Reason**: Matching system cũ không còn được sử dụng

**Impact**: Không còn code reference

---

### 2. ⚠️ **REDUNDANT Tables - CONSIDER REMOVING**

#### Teacher Rankings
```sql
-- Có thể tính toán on-the-fly từ teacher_reviews
DROP TABLE teacher_rankings;
```

**Reason**: Có thể tính toán từ `teacher_reviews` và `teacher_profiles`

**Alternative**: Tạo VIEW hoặc tính toán khi cần

---

#### Material Sales Summary
```sql
-- Có thể tính toán từ material_purchases
DROP TABLE material_sales_summary;
```

**Reason**: Có thể tính toán từ `material_purchases`

**Alternative**: Tạo VIEW hoặc cache

---

#### Teacher Earnings Summary
```sql
-- Có thể tính toán từ credit_transactions
DROP TABLE teacher_earnings_summary;
```

**Reason**: Có thể tính toán từ `credit_transactions` và `payment_holds`

**Alternative**: Tạo VIEW hoặc cache

---

### 3. ✅ **KEEP - Active Tables**

#### Core System
- ✅ `users` - Core user data
- ✅ `meetings` - Meeting rooms
- ✅ `meeting_participants` - Participants in meetings
- ✅ `meeting_chat_messages` - Chat messages
- ✅ `blocked_participants` - Blocked users

#### Course System (All Active)
- ✅ `courses`
- ✅ `course_sessions`
- ✅ `course_enrollments`
- ✅ `lessons`
- ✅ `lesson_materials`
- ✅ `session_materials` (if keeping both material types)
- ✅ `session_purchases`
- ✅ `payment_holds`

#### Teacher System (All Active)
- ✅ `teacher_profiles`
- ✅ `teacher_verifications`
- ✅ `teacher_verification_teaching_certificates`
- ✅ `teacher_verification_degree_certificates`
- ✅ `teacher_verification_references`
- ✅ `teacher_availability`
- ✅ `teacher_reviews`
- ✅ `teacher_media`

#### Marketplace (All Active)
- ✅ `materials`
- ✅ `material_categories`
- ✅ `material_purchases`
- ✅ `material_reviews`
- ✅ `material_review_helpful`

#### Credits & Payments (All Active)
- ✅ `credit_packages`
- ✅ `credit_transactions`
- ✅ `withdrawal_requests`
- ✅ `revenue_shares`
- ✅ `payment_methods`

#### Booking (All Active)
- ✅ `bookings`
- ✅ `booking_slots`

#### Communication (All Active)
- ✅ `global_chat_messages`
- ✅ `notifications`
- ✅ `email_queue`

#### Metrics & Monitoring (All Active)
- ✅ `livekit_metrics`
- ✅ `livekit_event_details`
- ✅ `bandwidth_metrics`
- ✅ `metrics_hourly`
- ✅ `webhook_events`
- ✅ `meeting_statistics`

#### Other (All Active)
- ✅ `user_activity_logs`
- ✅ `schedules`
- ✅ `ledger_transactions`
- ✅ `ledger_entries`
- ✅ `migrations_typeorm`

---

## 🎯 Recommended Actions

### Phase 1: Immediate Cleanup (Low Risk)

#### 1.1. Remove Deprecated Columns from Meetings
```sql
-- Backup first!
-- CREATE TABLE meetings_backup AS SELECT * FROM meetings;

ALTER TABLE meetings
DROP COLUMN is_classroom_only,
DROP COLUMN classroom_id;
```

**Impact**: None (fields not used)

**Time**: 5 minutes

---

#### 1.2. Drop Classroom Tables
```sql
-- Backup first!
DROP TABLE IF EXISTS classroom_announcements;
DROP TABLE IF EXISTS classroom_resources;
DROP TABLE IF EXISTS classroom_members;
DROP TABLE IF EXISTS classrooms;
```

**Impact**: None (system deprecated)

**Time**: 5 minutes

---

#### 1.3. Drop Matching Tables
```sql
DROP TABLE IF EXISTS match_history;
DROP TABLE IF EXISTS user_matching_preferences;
```

**Impact**: None (system not used)

**Time**: 2 minutes

---

### Phase 2: Optional Cleanup (Medium Risk)

#### 2.1. Remove Summary Tables (Replace with VIEWs)

```sql
-- Drop summary tables
DROP TABLE IF EXISTS teacher_rankings;
DROP TABLE IF EXISTS material_sales_summary;
DROP TABLE IF EXISTS teacher_earnings_summary;

-- Create VIEWs instead
CREATE VIEW teacher_rankings_view AS
SELECT 
  tp.user_id,
  tp.display_name,
  COUNT(tr.id) as total_reviews,
  AVG(tr.rating) as average_rating,
  SUM(CASE WHEN tr.rating >= 4 THEN 1 ELSE 0 END) as positive_reviews
FROM teacher_profiles tp
LEFT JOIN teacher_reviews tr ON tp.user_id = tr.teacher_id
GROUP BY tp.user_id, tp.display_name;

CREATE VIEW material_sales_summary_view AS
SELECT 
  m.id as material_id,
  m.title,
  COUNT(mp.id) as total_sales,
  SUM(mp.price_paid) as total_revenue
FROM materials m
LEFT JOIN material_purchases mp ON m.id = mp.material_id
GROUP BY m.id, m.title;

CREATE VIEW teacher_earnings_summary_view AS
SELECT 
  teacher_id,
  SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as total_earnings,
  SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END) as pending_earnings
FROM payment_holds
GROUP BY teacher_id;
```

**Impact**: 
- ✅ Giảm storage
- ✅ Luôn có data real-time
- ⚠️ Cần update queries sử dụng các tables này

**Time**: 1-2 hours (including code updates)

---

### Phase 3: Field-Level Cleanup (Other Tables)

#### 3.1. Review Each Table

Tôi sẽ kiểm tra từng table còn lại để tìm fields không cần thiết:

**Users Table** - Cần kiểm tra:
- `clerk_id` - Nếu không dùng Clerk auth thì remove
- `phone` - Đã remove rồi
- Các fields khác đều cần thiết

**Bookings Table** - Cần kiểm tra:
- Tất cả fields đều cần thiết cho booking system

**Credit Transactions** - Cần kiểm tra:
- Tất cả fields đều cần thiết cho audit trail

---

## 📝 Migration Scripts

### Script 1: Remove Deprecated Columns from Meetings

```typescript
// migrations/YYYYMMDDHHMMSS-RemoveDeprecatedMeetingColumns.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDeprecatedMeetingColumns1732700000000 implements MigrationInterface {
  name = 'RemoveDeprecatedMeetingColumns1732700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first (if exists)
    const table = await queryRunner.getTable('meetings');
    const foreignKey = table?.foreignKeys.find(
      fk => fk.columnNames.includes('classroom_id')
    );
    
    if (foreignKey) {
      await queryRunner.dropForeignKey('meetings', foreignKey);
    }

    // Drop columns
    await queryRunner.dropColumn('meetings', 'is_classroom_only');
    await queryRunner.dropColumn('meetings', 'classroom_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore columns
    await queryRunner.query(`
      ALTER TABLE meetings
      ADD COLUMN is_classroom_only TINYINT(1) DEFAULT 0,
      ADD COLUMN classroom_id VARCHAR(36) NULL
    `);
  }
}
```

---

### Script 2: Drop Classroom Tables

```typescript
// migrations/YYYYMMDDHHMMSS-DropClassroomTables.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropClassroomTables1732700000001 implements MigrationInterface {
  name = 'DropClassroomTables1732700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop in correct order (child tables first)
    await queryRunner.dropTable('classroom_announcements', true);
    await queryRunner.dropTable('classroom_resources', true);
    await queryRunner.dropTable('classroom_members', true);
    await queryRunner.dropTable('classrooms', true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore - data lost
    // Would need to recreate table structure
    throw new Error('Cannot rollback classroom table deletion');
  }
}
```

---

### Script 3: Drop Matching Tables

```typescript
// migrations/YYYYMMDDHHMMSS-DropMatchingTables.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropMatchingTables1732700000002 implements MigrationInterface {
  name = 'DropMatchingTables1732700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('match_history', true);
    await queryRunner.dropTable('user_matching_preferences', true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Cannot rollback matching table deletion');
  }
}
```

---

### Script 4: Replace Summary Tables with Views

```typescript
// migrations/YYYYMMDDHHMMSS-ReplaceSummaryTablesWithViews.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceSummaryTablesWithViews1732700000003 implements MigrationInterface {
  name = 'ReplaceSummaryTablesWithViews1732700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.dropTable('teacher_rankings', true);
    await queryRunner.dropTable('material_sales_summary', true);
    await queryRunner.dropTable('teacher_earnings_summary', true);

    // Create views
    await queryRunner.query(`
      CREATE VIEW teacher_rankings_view AS
      SELECT 
        tp.user_id,
        tp.display_name,
        COUNT(tr.id) as total_reviews,
        AVG(tr.rating) as average_rating,
        SUM(CASE WHEN tr.rating >= 4 THEN 1 ELSE 0 END) as positive_reviews
      FROM teacher_profiles tp
      LEFT JOIN teacher_reviews tr ON tp.user_id = tr.teacher_id
      GROUP BY tp.user_id, tp.display_name
    `);

    await queryRunner.query(`
      CREATE VIEW material_sales_summary_view AS
      SELECT 
        m.id as material_id,
        m.title,
        COUNT(mp.id) as total_sales,
        SUM(mp.price_paid) as total_revenue
      FROM materials m
      LEFT JOIN material_purchases mp ON m.id = mp.material_id
      GROUP BY m.id, m.title
    `);

    await queryRunner.query(`
      CREATE VIEW teacher_earnings_summary_view AS
      SELECT 
        teacher_id,
        SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as total_earnings,
        SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END) as pending_earnings
      FROM payment_holds
      GROUP BY teacher_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop views
    await queryRunner.query('DROP VIEW IF EXISTS teacher_rankings_view');
    await queryRunner.query('DROP VIEW IF EXISTS material_sales_summary_view');
    await queryRunner.query('DROP VIEW IF EXISTS teacher_earnings_summary_view');

    // Recreate tables (structure only, data lost)
    // ... (table creation SQL)
  }
}
```

---

## 📊 Summary

### Tables to Remove (9 tables)
1. ❌ `classroom_announcements`
2. ❌ `classroom_resources`
3. ❌ `classroom_members`
4. ❌ `classrooms`
5. ❌ `match_history`
6. ❌ `user_matching_preferences`
7. ⚠️ `teacher_rankings` (replace with VIEW)
8. ⚠️ `material_sales_summary` (replace with VIEW)
9. ⚠️ `teacher_earnings_summary` (replace with VIEW)

### Columns to Remove from Meetings (2 columns)
1. ❌ `is_classroom_only`
2. ❌ `classroom_id`

### Columns to Keep in Meetings (Important)
- ✅ `affiliate_code` - Đang được sử dụng cho course affiliate tracking (COURSE_MIFT...)

### Expected Benefits
- ✅ **Storage**: Giảm ~15-20% database size
- ✅ **Performance**: Ít indexes, ít joins
- ✅ **Maintenance**: Dễ quản lý hơn
- ✅ **Clarity**: Schema rõ ràng hơn

### Risks
- ⚠️ **Data Loss**: Nếu có data quan trọng trong deprecated tables
- ⚠️ **Code Breaking**: Nếu còn code reference đến deprecated fields
- ⚠️ **Rollback**: Khó rollback sau khi drop tables

### Recommendations
1. **Backup database** trước khi cleanup
2. **Test thoroughly** trên staging environment
3. **Phase cleanup**: Làm từng phase, không làm hết 1 lúc
4. **Monitor**: Theo dõi sau mỗi phase cleanup

---

## 🚀 Execution Plan

### Week 1: Preparation
- [ ] Backup production database
- [ ] Create staging environment
- [ ] Review all code references
- [ ] Create migration scripts

### Week 2: Phase 1 (Low Risk)
- [ ] Remove deprecated columns from meetings
- [ ] Drop classroom tables
- [ ] Drop matching tables
- [ ] Test thoroughly
- [ ] Deploy to production

### Week 3: Phase 2 (Medium Risk)
- [ ] Replace summary tables with views
- [ ] Update code to use views
- [ ] Test performance
- [ ] Deploy to production

### Week 4: Monitoring
- [ ] Monitor database performance
- [ ] Monitor application errors
- [ ] Optimize views if needed

---

**End of Document**
