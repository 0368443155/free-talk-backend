# 🛡️ Phase 5: Content Moderation & Reporting System

**Version**: 1.0  
**Status**: 🆕 **NEW FEATURE**  
**Priority**: High (Security & Safety)  
**Estimated Time**: 5-7 days  
**Depends On**: Phase 3 (Payment System)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Content Moderation Strategy](#content-moderation-strategy)
3. [Database Schema](#database-schema)
4. [AI Content Detection](#ai-content-detection)
5. [Report System](#report-system)
6. [Admin Moderation Dashboard](#admin-moderation-dashboard)
7. [API Endpoints](#api-endpoints)
8. [Implementation Guide](#implementation-guide)
9. [Testing Guide](#testing-guide)

---

## 📋 Overview

### Purpose

Xây dựng hệ thống kiểm duyệt nội dung và báo cáo để:
- ✅ Phát hiện nội dung nhạy cảm, đồi trụy
- ✅ Phát hiện phân biệt vùng miền, chủng tộc, giới tính
- ✅ Cho phép users báo cáo nội dung vi phạm
- ✅ Admin có dashboard để xem xét và xử lý

### Scope

**Content Types to Moderate**:
1. Course titles & descriptions
2. Lesson titles & descriptions
3. Material titles & descriptions
4. Chat messages (in meetings)
5. User profiles (bio, about)
6. Comments & reviews (future)

**Detection Methods**:
1. **AI-based**: OpenAI Moderation API / Perspective API
2. **Keyword-based**: Blacklist words
3. **User reports**: Community flagging

---

## 🧠 Content Moderation Strategy

### Multi-Layer Approach

```
┌─────────────────────────────────────────────────────────┐
│                    USER SUBMITS CONTENT                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Keyword Filter (Instant)                      │
│  - Check against blacklist                              │
│  - Block obvious violations                             │
│  - Fast, no API calls                                   │
└─────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │  Blocked?     │
                    └───────────────┘
                      Yes ↓     ↓ No
                    ┌─────┐   ┌─────────────────────────────┐
                    │ 🚫  │   │ LAYER 2: AI Moderation      │
                    │REJECT│   │ - OpenAI Moderation API    │
                    └─────┘   │ - Get confidence scores     │
                              │ - Auto-flag if high risk    │
                              └─────────────────────────────┘
                                        ↓
                              ┌───────────────────┐
                              │ High Risk?        │
                              └───────────────────┘
                            Yes ↓           ↓ No
                    ┌─────────────┐   ┌──────────────┐
                    │ AUTO-FLAG   │   │ ✅ APPROVED  │
                    │ For Review  │   │ Published    │
                    └─────────────┘   └──────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: User Reports                                  │
│  - Users can report content                             │
│  - Multiple reports = auto-flag                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: Admin Review                                  │
│  - Admin reviews flagged content                        │
│  - Approve / Reject / Ban user                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### 1. `content_moderation` Table

Stores moderation results for all content.

```sql
CREATE TABLE content_moderation (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- Content reference
  content_type ENUM('course', 'lesson', 'material', 'chat_message', 'user_profile', 'comment') NOT NULL,
  content_id VARCHAR(36) NOT NULL,
  content_text TEXT NOT NULL,
  
  -- Moderation results
  status ENUM('pending', 'approved', 'flagged', 'rejected', 'banned') DEFAULT 'pending',
  
  -- AI scores (0-1, higher = more likely to violate)
  ai_provider VARCHAR(50), -- 'openai', 'perspective', 'manual'
  
  -- OpenAI Moderation categories
  sexual_score DECIMAL(5,4) DEFAULT 0,
  hate_score DECIMAL(5,4) DEFAULT 0,
  harassment_score DECIMAL(5,4) DEFAULT 0,
  self_harm_score DECIMAL(5,4) DEFAULT 0,
  sexual_minors_score DECIMAL(5,4) DEFAULT 0,
  hate_threatening_score DECIMAL(5,4) DEFAULT 0,
  violence_graphic_score DECIMAL(5,4) DEFAULT 0,
  
  -- Custom categories (Vietnamese context)
  regional_discrimination_score DECIMAL(5,4) DEFAULT 0,
  racial_discrimination_score DECIMAL(5,4) DEFAULT 0,
  gender_discrimination_score DECIMAL(5,4) DEFAULT 0,
  
  -- Flagged reasons (JSON array)
  flagged_categories JSON, -- ["sexual", "hate", "regional_discrimination"]
  
  -- Keyword matches
  matched_keywords JSON, -- ["từ khóa 1", "từ khóa 2"]
  
  -- Review info
  reviewed_by VARCHAR(36), -- Admin user ID
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_content_type_id (content_type, content_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. `content_reports` Table

User-submitted reports.

```sql
CREATE TABLE content_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- Reporter
  reporter_id VARCHAR(36) NOT NULL,
  
  -- Content being reported
  content_type ENUM('course', 'lesson', 'material', 'chat_message', 'user_profile', 'comment') NOT NULL,
  content_id VARCHAR(36) NOT NULL,
  
  -- Report details
  reason ENUM(
    'sexual_content',
    'hate_speech',
    'harassment',
    'violence',
    'regional_discrimination',
    'racial_discrimination',
    'gender_discrimination',
    'spam',
    'misinformation',
    'other'
  ) NOT NULL,
  description TEXT,
  
  -- Status
  status ENUM('pending', 'reviewing', 'resolved', 'dismissed') DEFAULT 'pending',
  
  -- Resolution
  resolved_by VARCHAR(36), -- Admin user ID
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  action_taken ENUM('none', 'content_removed', 'user_warned', 'user_suspended', 'user_banned'),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reporter_id (reporter_id),
  INDEX idx_content_type_id (content_type, content_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  -- Prevent duplicate reports from same user
  UNIQUE KEY unique_report (reporter_id, content_type, content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. `moderation_keywords` Table

Blacklist keywords for instant blocking.

```sql
CREATE TABLE moderation_keywords (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  keyword VARCHAR(255) NOT NULL,
  category ENUM(
    'sexual',
    'hate',
    'violence',
    'regional_discrimination',
    'racial_discrimination',
    'gender_discrimination',
    'spam'
  ) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  
  -- Auto-action
  auto_block BOOLEAN DEFAULT false, -- If true, instantly block content
  
  -- Pattern matching
  is_regex BOOLEAN DEFAULT false,
  case_sensitive BOOLEAN DEFAULT false,
  
  -- Metadata
  added_by VARCHAR(36),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_category (category),
  INDEX idx_severity (severity),
  UNIQUE KEY unique_keyword (keyword, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. `user_moderation_history` Table

Track user violations.

```sql
CREATE TABLE user_moderation_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  user_id VARCHAR(36) NOT NULL,
  
  -- Violation
  violation_type ENUM(
    'content_violation',
    'spam',
    'harassment',
    'multiple_reports'
  ) NOT NULL,
  
  -- Reference
  content_type VARCHAR(50),
  content_id VARCHAR(36),
  moderation_id VARCHAR(36), -- Reference to content_moderation
  
  -- Action taken
  action ENUM('warning', 'content_removed', 'temporary_ban', 'permanent_ban') NOT NULL,
  duration_days INT, -- For temporary bans
  
  -- Details
  reason TEXT NOT NULL,
  admin_notes TEXT,
  
  -- Admin who took action
  actioned_by VARCHAR(36),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actioned_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (moderation_id) REFERENCES content_moderation(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. Add to `users` Table

```sql
ALTER TABLE users
ADD COLUMN is_banned BOOLEAN DEFAULT false,
ADD COLUMN ban_reason TEXT,
ADD COLUMN banned_until TIMESTAMP NULL,
ADD COLUMN banned_by VARCHAR(36),
ADD COLUMN banned_at TIMESTAMP NULL,
ADD COLUMN violation_count INT DEFAULT 0,
ADD FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL;
```

---

## 🤖 AI Content Detection

### Option 1: OpenAI Moderation API (Recommended)

**Pros**:
- ✅ Free
- ✅ Fast (< 1 second)
- ✅ High accuracy
- ✅ Multiple categories
- ✅ Easy to integrate

**Cons**:
- ❌ English-focused (less accurate for Vietnamese)
- ❌ Requires OpenAI API key

**Implementation**:

```typescript
// src/common/services/content-moderation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    self_harm: boolean;
    sexual_minors: boolean;
    hate_threatening: boolean;
    violence_graphic: boolean;
  };
  category_scores: {
    sexual: number;
    hate: number;
    harassment: number;
    self_harm: number;
    sexual_minors: number;
    hate_threatening: number;
    violence_graphic: number;
  };
}

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Moderate content using OpenAI Moderation API
   */
  async moderateWithOpenAI(text: string): Promise<ModerationResult> {
    try {
      const response = await this.openai.moderations.create({
        input: text,
      });

      const result = response.results[0];

      this.logger.log(`OpenAI Moderation: flagged=${result.flagged}`);

      return {
        flagged: result.flagged,
        categories: result.categories,
        category_scores: result.category_scores,
      };
    } catch (error) {
      this.logger.error(`OpenAI Moderation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if content should be auto-blocked
   */
  shouldAutoBlock(result: ModerationResult): boolean {
    const { category_scores } = result;

    // Auto-block if any score > 0.8 (80% confidence)
    const highRiskCategories = [
      'sexual',
      'sexual_minors',
      'hate_threatening',
      'violence_graphic',
    ];

    for (const category of highRiskCategories) {
      if (category_scores[category] > 0.8) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if content should be flagged for review
   */
  shouldFlag(result: ModerationResult): boolean {
    const { category_scores } = result;

    // Flag if any score > 0.5 (50% confidence)
    for (const score of Object.values(category_scores)) {
      if (score > 0.5) {
        return true;
      }
    }

    return false;
  }
}
```

---

### Option 2: Perspective API (Google)

**Pros**:
- ✅ Free (up to 1M requests/day)
- ✅ Multiple languages
- ✅ Toxicity detection

**Cons**:
- ❌ Slower than OpenAI
- ❌ Requires Google Cloud API key

**Implementation**:

```typescript
import axios from 'axios';

async moderateWithPerspective(text: string): Promise<any> {
  const apiKey = this.configService.get('GOOGLE_PERSPECTIVE_API_KEY');
  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;

  const response = await axios.post(url, {
    comment: { text },
    languages: ['en', 'vi'],
    requestedAttributes: {
      TOXICITY: {},
      SEVERE_TOXICITY: {},
      IDENTITY_ATTACK: {},
      INSULT: {},
      PROFANITY: {},
      THREAT: {},
    },
  });

  return response.data.attributeScores;
}
```

---

### Option 3: Custom Keyword Matching (Vietnamese)

For Vietnamese-specific content:

```typescript
/**
 * Check against keyword blacklist
 */
async checkKeywords(text: string): Promise<{
  matched: boolean;
  keywords: string[];
  categories: string[];
  shouldBlock: boolean;
}> {
  const keywords = await this.moderationKeywordRepository.find();

  const matched: string[] = [];
  const categories: Set<string> = new Set();
  let shouldBlock = false;

  for (const keyword of keywords) {
    const pattern = keyword.is_regex
      ? new RegExp(keyword.keyword, keyword.case_sensitive ? '' : 'i')
      : keyword.case_sensitive
      ? keyword.keyword
      : keyword.keyword.toLowerCase();

    const searchText = keyword.case_sensitive ? text : text.toLowerCase();

    const isMatch = keyword.is_regex
      ? pattern.test(searchText)
      : searchText.includes(pattern as string);

    if (isMatch) {
      matched.push(keyword.keyword);
      categories.add(keyword.category);

      if (keyword.auto_block) {
        shouldBlock = true;
      }
    }
  }

  return {
    matched: matched.length > 0,
    keywords: matched,
    categories: Array.from(categories),
    shouldBlock,
  };
}
```

---

### Vietnamese Keyword Examples

```typescript
// Seed data for moderation_keywords table

const vietnameseKeywords = [
  // Regional discrimination
  { keyword: 'miền nam', category: 'regional_discrimination', severity: 'medium' },
  { keyword: 'miền bắc', category: 'regional_discrimination', severity: 'medium' },
  { keyword: 'miền trung', category: 'regional_discrimination', severity: 'medium' },
  { keyword: 'dân miền', category: 'regional_discrimination', severity: 'high' },
  
  // Racial discrimination
  { keyword: 'chủng tộc', category: 'racial_discrimination', severity: 'high' },
  { keyword: 'phân biệt màu da', category: 'racial_discrimination', severity: 'high' },
  
  // Gender discrimination
  { keyword: 'đàn bà', category: 'gender_discrimination', severity: 'medium' },
  { keyword: 'con gái', category: 'gender_discrimination', severity: 'low' },
  { keyword: 'phụ nữ không', category: 'gender_discrimination', severity: 'high' },
  
  // Sexual content
  { keyword: 'sex', category: 'sexual', severity: 'high', auto_block: true },
  { keyword: 'porn', category: 'sexual', severity: 'critical', auto_block: true },
  
  // Hate speech
  { keyword: 'đồ ngu', category: 'hate', severity: 'medium' },
  { keyword: 'thằng ngu', category: 'hate', severity: 'medium' },
  { keyword: 'con chó', category: 'hate', severity: 'high' },
];
```

---

## 📊 Combined Moderation Flow

```typescript
/**
 * Full moderation pipeline
 */
async moderateContent(
  contentType: string,
  contentId: string,
  text: string,
): Promise<{
  approved: boolean;
  flagged: boolean;
  blocked: boolean;
  reasons: string[];
}> {
  // Step 1: Keyword check (instant)
  const keywordResult = await this.checkKeywords(text);

  if (keywordResult.shouldBlock) {
    // Instant block
    await this.saveModeration({
      content_type: contentType,
      content_id: contentId,
      content_text: text,
      status: 'rejected',
      matched_keywords: keywordResult.keywords,
      flagged_categories: keywordResult.categories,
    });

    return {
      approved: false,
      flagged: true,
      blocked: true,
      reasons: ['Keyword blacklist match'],
    };
  }

  // Step 2: AI moderation (OpenAI)
  const aiResult = await this.moderateWithOpenAI(text);

  if (this.shouldAutoBlock(aiResult)) {
    // AI auto-block
    await this.saveModeration({
      content_type: contentType,
      content_id: contentId,
      content_text: text,
      status: 'rejected',
      ai_provider: 'openai',
      sexual_score: aiResult.category_scores.sexual,
      hate_score: aiResult.category_scores.hate,
      harassment_score: aiResult.category_scores.harassment,
      // ... other scores
      flagged_categories: Object.keys(aiResult.categories).filter(
        (k) => aiResult.categories[k],
      ),
    });

    return {
      approved: false,
      flagged: true,
      blocked: true,
      reasons: ['AI detected high-risk content'],
    };
  }

  if (this.shouldFlag(aiResult) || keywordResult.matched) {
    // Flag for review
    await this.saveModeration({
      content_type: contentType,
      content_id: contentId,
      content_text: text,
      status: 'flagged',
      ai_provider: 'openai',
      // ... scores
      matched_keywords: keywordResult.keywords,
    });

    return {
      approved: false,
      flagged: true,
      blocked: false,
      reasons: ['Flagged for admin review'],
    };
  }

  // Step 3: Approved
  await this.saveModeration({
    content_type: contentType,
    content_id: contentId,
    content_text: text,
    status: 'approved',
    ai_provider: 'openai',
    // ... scores
  });

  return {
    approved: true,
    flagged: false,
    blocked: false,
    reasons: [],
  };
}
```

---

## 🚨 Report System

### Entity

```typescript
// src/features/moderation/entities/content-report.entity.ts

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
import { User } from '../../../users/user.entity';

export enum ReportReason {
  SEXUAL_CONTENT = 'sexual_content',
  HATE_SPEECH = 'hate_speech',
  HARASSMENT = 'harassment',
  VIOLENCE = 'violence',
  REGIONAL_DISCRIMINATION = 'regional_discrimination',
  RACIAL_DISCRIMINATION = 'racial_discrimination',
  GENDER_DISCRIMINATION = 'gender_discrimination',
  SPAM = 'spam',
  MISINFORMATION = 'misinformation',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ActionTaken {
  NONE = 'none',
  CONTENT_REMOVED = 'content_removed',
  USER_WARNED = 'user_warned',
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
}

@Entity('content_reports')
@Index(['reporter_id'])
@Index(['content_type', 'content_id'])
@Index(['status'])
export class ContentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reporter_id: string;

  @Column({ type: 'varchar', length: 50 })
  content_type: string; // 'course', 'lesson', 'material', etc.

  @Column({ type: 'uuid' })
  content_id: string;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'uuid', nullable: true })
  resolved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column({ type: 'enum', enum: ActionTaken, nullable: true })
  action_taken: ActionTaken;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;
}
```

---

### DTOs

```typescript
// src/features/moderation/dto/report.dto.ts

import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ActionTaken } from '../entities/content-report.entity';

export class CreateReportDto {
  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ResolveReportDto {
  @ApiProperty({ enum: ActionTaken })
  @IsEnum(ActionTaken)
  action_taken: ActionTaken;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution_notes?: string;
}
```

---

### Service

```typescript
// src/features/moderation/moderation.service.ts

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ContentReport)
    private reportRepository: Repository<ContentReport>,
  ) {}

  /**
   * Create a report
   */
  async createReport(
    reporterId: string,
    contentType: string,
    contentId: string,
    dto: CreateReportDto,
  ): Promise<ContentReport> {
    // Check if user already reported this content
    const existing = await this.reportRepository.findOne({
      where: {
        reporter_id: reporterId,
        content_type: contentType,
        content_id: contentId,
      },
    });

    if (existing) {
      throw new BadRequestException('You have already reported this content');
    }

    const report = this.reportRepository.create({
      reporter_id: reporterId,
      content_type: contentType,
      content_id: contentId,
      reason: dto.reason,
      description: dto.description,
      status: ReportStatus.PENDING,
    });

    const saved = await this.reportRepository.save(report);

    // Check if multiple reports (auto-flag)
    const reportCount = await this.reportRepository.count({
      where: {
        content_type: contentType,
        content_id: contentId,
        status: ReportStatus.PENDING,
      },
    });

    if (reportCount >= 3) {
      // Auto-flag content after 3 reports
      await this.autoFlagContent(contentType, contentId);
    }

    return saved;
  }

  /**
   * Get reports for admin
   */
  async getReports(status?: ReportStatus): Promise<ContentReport[]> {
    const where: any = {};
    if (status) where.status = status;

    return this.reportRepository.find({
      where,
      relations: ['reporter', 'resolver'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Resolve a report
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    dto: ResolveReportDto,
  ): Promise<ContentReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = ReportStatus.RESOLVED;
    report.resolved_by = adminId;
    report.resolved_at = new Date();
    report.action_taken = dto.action_taken;
    report.resolution_notes = dto.resolution_notes;

    return this.reportRepository.save(report);
  }
}
```

---

## 🎛️ Admin Moderation Dashboard

### API Endpoints

```typescript
// src/features/moderation/moderation.controller.ts

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  // ==================== REPORTS ====================

  @Post('reports/:contentType/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report content' })
  async createReport(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @Req() req: any,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.createReport(
      req.user.id,
      contentType,
      contentId,
      dto,
    );
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reports (Admin only)' })
  async getReports(@Query('status') status?: ReportStatus) {
    return this.moderationService.getReports(status);
  }

  @Patch('reports/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve report (Admin only)' })
  async resolveReport(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(id, req.user.id, dto);
  }

  // ==================== FLAGGED CONTENT ====================

  @Get('flagged')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get flagged content (Admin only)' })
  async getFlaggedContent() {
    return this.moderationService.getFlaggedContent();
  }

  @Patch('flagged/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve flagged content (Admin only)' })
  async approveContent(@Param('id') id: string, @Req() req: any) {
    return this.moderationService.approveContent(id, req.user.id);
  }

  @Patch('flagged/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject flagged content (Admin only)' })
  async rejectContent(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { reason: string },
  ) {
    return this.moderationService.rejectContent(id, req.user.id, body.reason);
  }

  // ==================== USER MODERATION ====================

  @Post('users/:userId/warn')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Warn user (Admin only)' })
  async warnUser(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() body: { reason: string },
  ) {
    return this.moderationService.warnUser(userId, req.user.id, body.reason);
  }

  @Post('users/:userId/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ban user (Admin only)' })
  async banUser(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() body: { reason: string; duration_days?: number },
  ) {
    return this.moderationService.banUser(
      userId,
      req.user.id,
      body.reason,
      body.duration_days,
    );
  }

  @Post('users/:userId/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unban user (Admin only)' })
  async unbanUser(@Param('userId') userId: string, @Req() req: any) {
    return this.moderationService.unbanUser(userId, req.user.id);
  }

  // ==================== KEYWORDS ====================

  @Get('keywords')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get moderation keywords (Admin only)' })
  async getKeywords() {
    return this.moderationService.getKeywords();
  }

  @Post('keywords')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add moderation keyword (Admin only)' })
  async addKeyword(@Req() req: any, @Body() dto: CreateKeywordDto) {
    return this.moderationService.addKeyword(req.user.id, dto);
  }

  @Delete('keywords/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete moderation keyword (Admin only)' })
  async deleteKeyword(@Param('id') id: string) {
    return this.moderationService.deleteKeyword(id);
  }
}
```

---

## 📝 Integration with Existing Features

### Hook into Course Creation

```typescript
// src/features/courses/courses.service.ts

async createCourse(teacherId: string, dto: CreateCourseDto): Promise<Course> {
  // ... existing code ...

  // ✅ ADD MODERATION
  const moderationResult = await this.contentModerationService.moderateContent(
    'course',
    savedCourse.id,
    `${dto.title} ${dto.description}`,
  );

  if (moderationResult.blocked) {
    // Delete course and throw error
    await this.courseRepository.delete(savedCourse.id);
    throw new BadRequestException(
      'Content violates community guidelines and cannot be published',
    );
  }

  if (moderationResult.flagged) {
    // Mark course as pending review
    savedCourse.status = CourseStatus.DRAFT;
    savedCourse.is_published = false;
    await this.courseRepository.save(savedCourse);

    this.logger.warn(
      `Course ${savedCourse.id} flagged for review: ${moderationResult.reasons.join(', ')}`,
    );
  }

  return savedCourse;
}
```

---

## 🧪 Testing Guide

### Test 1: Keyword Blocking

```bash
# Add test keyword
POST http://localhost:3000/api/moderation/keywords
Headers: Authorization: Bearer {admin_token}
Body: {
  "keyword": "test_bad_word",
  "category": "hate",
  "severity": "high",
  "auto_block": true
}

# Try to create course with bad word
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {teacher_token}
Body: {
  "title": "Course with test_bad_word",
  "description": "Test",
  ...
}
# Expected: 400 Bad Request - Content blocked
```

---

### Test 2: AI Moderation

```bash
# Create course with sexual content
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {teacher_token}
Body: {
  "title": "Adult content course",
  "description": "This course contains explicit sexual content...",
  ...
}
# Expected: 400 Bad Request - AI blocked
```

---

### Test 3: User Report

```bash
# Create normal course
POST http://localhost:3000/api/courses
Headers: Authorization: Bearer {teacher_token}
Body: { "title": "Normal Course", ... }
# Save course_id

# User reports course
POST http://localhost:3000/api/moderation/reports/course/{course_id}
Headers: Authorization: Bearer {student_token}
Body: {
  "reason": "hate_speech",
  "description": "This course contains offensive content"
}
# Expected: 201 Created

# Admin reviews reports
GET http://localhost:3000/api/moderation/reports?status=pending
Headers: Authorization: Bearer {admin_token}
# Expected: List of reports

# Admin resolves report
PATCH http://localhost:3000/api/moderation/reports/{report_id}/resolve
Headers: Authorization: Bearer {admin_token}
Body: {
  "action_taken": "content_removed",
  "resolution_notes": "Content removed due to hate speech"
}
# Expected: 200 OK
```

---

## 📋 Implementation Checklist

### Phase 5.1: Database & Entities
- [ ] Create migration for `content_moderation` table
- [ ] Create migration for `content_reports` table
- [ ] Create migration for `moderation_keywords` table
- [ ] Create migration for `user_moderation_history` table
- [ ] Update `users` table with ban fields
- [ ] Create all entities

### Phase 5.2: AI Integration
- [ ] Install OpenAI SDK: `npm install openai`
- [ ] Add `OPENAI_API_KEY` to `.env`
- [ ] Implement `ContentModerationService`
- [ ] Implement keyword matching
- [ ] Test AI moderation

### Phase 5.3: Report System
- [ ] Create `ContentReport` entity
- [ ] Create DTOs
- [ ] Implement `ModerationService`
- [ ] Create controller endpoints
- [ ] Test report flow

### Phase 5.4: Integration
- [ ] Hook moderation into `createCourse()`
- [ ] Hook moderation into `createLesson()`
- [ ] Hook moderation into `addMaterial()`
- [ ] Hook moderation into chat messages
- [ ] Test end-to-end

### Phase 5.5: Admin Dashboard
- [ ] Create admin endpoints
- [ ] Implement flagged content review
- [ ] Implement user ban/unban
- [ ] Implement keyword management
- [ ] Test admin workflows

---

## 🎯 Summary

**Time Estimate**: 5-7 days

**Dependencies**:
- OpenAI API key
- Phase 3 (Payment) completed

**Impact**:
- ✅ Platform safety
- ✅ Community trust
- ✅ Legal compliance
- ✅ User protection

---

**End of Document**
