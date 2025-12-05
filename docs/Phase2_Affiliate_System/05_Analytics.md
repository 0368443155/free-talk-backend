# 05. Analytics & Reporting (Detailed)

## 1. Database Schema for Analytics

### 1.1. Analytics Entity (`src/features/analytics/entities/analytics-daily.entity.ts`)
Bảng này lưu trữ số liệu tổng hợp theo ngày để query nhanh cho Admin Dashboard.

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_daily_stats')
@Index(['date'], { unique: true })
export class AnalyticsDailyStat {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'date' })
    date: string; // YYYY-MM-DD

    // Revenue Metrics
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total_revenue: number; // Tổng tiền student trả

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    platform_revenue: number; // Doanh thu platform

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    teacher_payouts: number; // Tiền trả teacher

    // User Growth Metrics
    @Column({ type: 'int', default: 0 })
    new_users_total: number;

    @Column({ type: 'int', default: 0 })
    new_users_organic: number;

    @Column({ type: 'int', default: 0 })
    new_users_referral: number;

    // Activity Metrics
    @Column({ type: 'int', default: 0 })
    active_users: number; // Users who logged in or took action

    @Column({ type: 'int', default: 0 })
    total_meetings_ended: number;

    @CreateDateColumn()
    created_at: Date;
}
```

## 2. Backend Logic Implementation

### 2.1. Daily Analytics Job (`src/features/analytics/jobs/daily-analytics.job.ts`)
Sử dụng `@nestjs/schedule` để chạy lúc 00:05 sáng hàng ngày, tổng hợp dữ liệu ngày hôm trước.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { AnalyticsDailyStat } from '../entities/analytics-daily.entity';

@Injectable()
export class DailyAnalyticsJob {
    private readonly logger = new Logger(DailyAnalyticsJob.name);

    constructor(private dataSource: DataSource) {}

    @Cron('0 5 0 * * *') // Run at 00:05 AM every day
    async generateDailyStats() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        this.logger.log(`Generating analytics for ${dateStr}...`);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Aggregate Revenue
            const revenueStats = await queryRunner.query(`
                SELECT 
                    SUM(credit_amount) as total,
                    SUM(platform_fee_amount) as platform,
                    SUM(teacher_amount) as teacher
                FROM credit_transactions 
                WHERE transaction_type = 'deduction' 
                AND DATE(created_at) = '${dateStr}'
            `);

            // 2. Aggregate Users
            const userStats = await queryRunner.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN referrer_id IS NOT NULL THEN 1 END) as referral
                FROM users 
                WHERE DATE(created_at) = '${dateStr}'
            `);

            // 3. Save to Analytics Table
            const stat = new AnalyticsDailyStat();
            stat.date = dateStr;
            stat.total_revenue = revenueStats[0].total || 0;
            stat.platform_revenue = revenueStats[0].platform || 0;
            stat.teacher_payouts = revenueStats[0].teacher || 0;
            stat.new_users_total = userStats[0].total || 0;
            stat.new_users_referral = userStats[0].referral || 0;
            stat.new_users_organic = stat.new_users_total - stat.new_users_referral;

            await queryRunner.manager.save(stat);
            await queryRunner.commitTransaction();
            
            this.logger.log(`Analytics for ${dateStr} generated successfully.`);

        } catch (err) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Failed to generate analytics', err);
        } finally {
            await queryRunner.release();
        }
    }
}
```

### 2.2. Admin API (`src/features/analytics/analytics.controller.ts`)

```typescript
@Controller('api/v1/admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('revenue')
    async getRevenueStats(
        @Query('from') from: string,
        @Query('to') to: string
    ) {
        // Query from analytics_daily_stats table
        return this.analyticsService.getDailyStats(from, to);
    }

    @Get('top-referrers')
    async getTopReferrers() {
        // Real-time query to find top performing affiliates
        return this.dataSource.query(`
            SELECT 
                u.id, u.username, u.email,
                COUNT(r.id) as referral_count,
                SUM(t.credit_amount) as total_earnings
            FROM users u
            LEFT JOIN users r ON r.referrer_id = u.id
            LEFT JOIN credit_transactions t ON t.user_id = u.id AND t.transaction_type = 'affiliate_bonus'
            GROUP BY u.id
            ORDER BY referral_count DESC
            LIMIT 10
        `);
    }
}
```

## 3. Visualization Plan (Admin Dashboard)

### 3.1. Libraries
*   **Recharts**: Vẽ biểu đồ (Line, Bar, Pie).
*   **DateRangePicker**: Chọn khoảng thời gian báo cáo.

### 3.2. Chart Types
1.  **Revenue Trend (Stacked Bar)**:
    *   X-Axis: Date
    *   Y-Axis: Amount
    *   Series: [Teacher Payout, Platform Revenue]
2.  **User Acquisition (Line)**:
    *   X-Axis: Date
    *   Y-Axis: Count
    *   Series: [Organic, Referral]

## 4. Implementation Steps

1.  **Migration**: Create `analytics_daily_stats` table.
2.  **Job**: Implement `DailyAnalyticsJob` and register in `AppModule`.
3.  **API**: Create `AnalyticsController`.
4.  **Frontend**: Build Admin Dashboard page using the new APIs.
