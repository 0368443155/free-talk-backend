import { Controller, Get, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../features/meeting/entities/meeting.entity';
import { LiveKitMetric } from '../metrics/livekit-metric.entity';

@Controller('debug')
export class DebugController {
    private readonly logger = new Logger(DebugController.name);

    constructor(
        @InjectRepository(Meeting)
        private meetingRepo: Repository<Meeting>,
        @InjectRepository(LiveKitMetric)
        private livekitMetricRepo: Repository<LiveKitMetric>,
    ) {}

    @Get('data-summary')
    async getDataSummary() {
        try {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // 1. Meetings trong 24h
            const meetings24h = await this.meetingRepo.find({
                where: {
                    created_at: twentyFourHoursAgo as any // TypeORM MoreThanOrEqual
                },
                order: { created_at: 'DESC' },
                take: 20
            });

            // 2. Meetings theo giờ
            const meetingsByHour = await this.meetingRepo
                .createQueryBuilder('meeting')
                .select([
                    'DATE_FORMAT(meeting.created_at, "%H:00") as hour',
                    'COUNT(*) as count',
                    'SUM(CASE WHEN meeting.status = "live" THEN 1 ELSE 0 END) as live_count'
                ])
                .where('meeting.created_at >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('hour')
                .orderBy('hour', 'ASC')
                .getRawMany();

            // 3. LiveKit metrics
            const metrics24h = await this.livekitMetricRepo.find({
                where: {
                    createdAt: twentyFourHoursAgo as any
                },
                order: { createdAt: 'DESC' },
                take: 20
            });

            // 4. Metrics theo giờ
            const metricsByHour = await this.livekitMetricRepo
                .createQueryBuilder('metric')
                .select([
                    'DATE_FORMAT(metric.createdAt, "%H:00") as hour',
                    'COUNT(*) as count',
                    'COUNT(DISTINCT metric.meetingId) as unique_meetings',
                    'AVG(metric.bitrate) as avg_bitrate'
                ])
                .where('metric.createdAt >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('hour')
                .orderBy('hour', 'ASC')
                .getRawMany();

            // 5. Cross-reference meetings với metrics
            const meetingsWithMetrics = await this.meetingRepo
                .createQueryBuilder('meeting')
                .leftJoin('livekit_metrics', 'metric', 'meeting.id = metric.meetingId')
                .select([
                    'meeting.id as meeting_id',
                    'meeting.title',
                    'meeting.status',
                    'meeting.created_at',
                    'meeting.started_at',
                    'COUNT(metric.id) as metrics_count',
                    'MAX(metric.createdAt) as last_metric_time'
                ])
                .where('meeting.created_at >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('meeting.id, meeting.title, meeting.status, meeting.created_at, meeting.started_at')
                .orderBy('meeting.created_at', 'DESC')
                .getRawMany();

            // 6. Current time info
            const currentTimeInfo = {
                server_time: now.toISOString(),
                server_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                twenty_four_hours_ago: twentyFourHoursAgo.toISOString(),
                current_hour: now.getHours()
            };

            return {
                timestamp: now.toISOString(),
                time_info: currentTimeInfo,
                summary: {
                    total_meetings_24h: meetings24h.length,
                    total_metrics_24h: metrics24h.length,
                    live_meetings: meetings24h.filter(m => m.status === 'live').length,
                    meetings_with_metrics: meetingsWithMetrics.filter(m => m.metrics_count > 0).length
                },
                meetings_by_hour: meetingsByHour,
                metrics_by_hour: metricsByHour,
                recent_meetings: meetings24h.slice(0, 10).map(m => ({
                    id: m.id.slice(0, 8),
                    title: m.title,
                    status: m.status,
                    created_at: m.created_at,
                    started_at: m.started_at,
                    current_participants: m.current_participants
                })),
                recent_metrics: metrics24h.slice(0, 10).map(m => ({
                    meeting_id: m.meetingId.slice(0, 8),
                    user_id: m.userId,
                    quality: m.quality,
                    bitrate: m.bitrate,
                    created_at: m.createdAt
                })),
                meetings_with_metrics: meetingsWithMetrics.map(m => ({
                    meeting_id: m.meeting_id.slice(0, 8),
                    title: m.title,
                    status: m.status,
                    created_at: m.created_at,
                    metrics_count: parseInt(m.metrics_count),
                    has_metrics: parseInt(m.metrics_count) > 0,
                    last_metric_time: m.last_metric_time
                }))
            };

        } catch (error) {
            this.logger.error(`Failed to get data summary: ${error.message}`);
            throw error;
        }
    }

    @Get('webhook-logs')
    async getWebhookLogs() {
        try {
            // Recent webhook activity (based on metrics creation)
            const recentActivity = await this.livekitMetricRepo.find({
                order: { createdAt: 'DESC' },
                take: 10
            });

            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const activityLastHour = await this.livekitMetricRepo.count({
                where: {
                    createdAt: oneHourAgo as any
                }
            });

            return {
                recent_webhook_activity: recentActivity.length,
                activity_last_hour: activityLastHour,
                last_activity: recentActivity[0]?.createdAt || null,
                recent_events: recentActivity.map(m => ({
                    meeting_id: m.meetingId.slice(0, 8),
                    user_id: m.userId,
                    timestamp: m.createdAt,
                    quality: m.quality
                }))
            };

        } catch (error) {
            this.logger.error(`Failed to get webhook logs: ${error.message}`);
            throw error;
        }
    }

    @Get('discrepancy-analysis')
    async analyzeDiscrepancy() {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Analyze why dashboard shows 2 sessions but total shows 9
            const hourlyCounts = await this.meetingRepo
                .createQueryBuilder('meeting')
                .select([
                    'DATE_FORMAT(meeting.created_at, "%Y-%m-%d %H:00:00") as hour_bucket',
                    'DATE_FORMAT(meeting.created_at, "%H:00") as hour_only',
                    'COUNT(*) as meeting_count',
                    'SUM(CASE WHEN meeting.status = "live" THEN 1 ELSE 0 END) as live_count',
                    'SUM(CASE WHEN meeting.status = "ended" THEN 1 ELSE 0 END) as ended_count'
                ])
                .where('meeting.created_at >= :oneDayAgo', { oneDayAgo })
                .groupBy('hour_bucket')
                .orderBy('hour_bucket', 'DESC')
                .getRawMany();

            const metricHourlyCounts = await this.livekitMetricRepo
                .createQueryBuilder('metric')
                .select([
                    'DATE_FORMAT(metric.createdAt, "%Y-%m-%d %H:00:00") as hour_bucket',
                    'DATE_FORMAT(metric.createdAt, "%H:00") as hour_only',
                    'COUNT(*) as metric_count',
                    'COUNT(DISTINCT metric.meetingId) as unique_meetings'
                ])
                .where('metric.createdAt >= :oneDayAgo', { oneDayAgo })
                .groupBy('hour_bucket')
                .orderBy('hour_bucket', 'DESC')
                .getRawMany();

            return {
                analysis_time: now.toISOString(),
                potential_issues: [
                    "Dashboard may be filtering by different time ranges",
                    "Graph may be showing only metrics with data vs total meetings",
                    "Time zone differences between server and display",
                    "Caching issues in dashboard data"
                ],
                meetings_by_hour: hourlyCounts,
                metrics_by_hour: metricHourlyCounts,
                total_meetings_24h: hourlyCounts.reduce((sum, h) => sum + parseInt(h.meeting_count), 0),
                total_metrics_24h: metricHourlyCounts.reduce((sum, h) => sum + parseInt(h.metric_count), 0),
                recommendations: [
                    "Check if dashboard is using server local time vs UTC",
                    "Verify the time range filters in dashboard queries",
                    "Ensure both metrics and meetings use same time source",
                    "Check if some meetings don't trigger webhook events"
                ]
            };

        } catch (error) {
            this.logger.error(`Failed to analyze discrepancy: ${error.message}`);
            throw error;
        }
    }
}