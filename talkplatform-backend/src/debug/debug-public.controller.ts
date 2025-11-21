import { Controller, Get, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../features/meeting/entities/meeting.entity';
import { LiveKitMetric } from '../metrics/livekit-metric.entity';

@Controller('debug-public')
export class DebugPublicController {
    private readonly logger = new Logger(DebugPublicController.name);

    constructor(
        @InjectRepository(Meeting)
        private meetingRepo: Repository<Meeting>,
        @InjectRepository(LiveKitMetric)
        private livekitMetricRepo: Repository<LiveKitMetric>,
    ) {}

    @Get('data-inconsistency')
    async analyzeDataInconsistency() {
        try {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // 1. Count total meetings in 24h
            const totalMeetings24h = await this.meetingRepo.count({
                where: {
                    created_at: twentyFourHoursAgo as any
                }
            });

            // 2. Meetings by hour (both UTC and Vietnam time)
            const meetingsByHourUTC = await this.meetingRepo
                .createQueryBuilder('meeting')
                .select([
                    'DATE_FORMAT(meeting.created_at, "%Y-%m-%d %H:00:00") as hour_bucket_utc',
                    'DATE_FORMAT(meeting.created_at, "%H:00") as hour_only_utc', 
                    'COUNT(*) as count'
                ])
                .where('meeting.created_at >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('hour_bucket_utc')
                .orderBy('hour_bucket_utc', 'DESC')
                .getRawMany();

            const meetingsByHourVN = await this.meetingRepo
                .createQueryBuilder('meeting')
                .select([
                    'DATE_FORMAT(DATE_ADD(meeting.created_at, INTERVAL 7 HOUR), "%Y-%m-%d %H:00:00") as hour_bucket_vn',
                    'DATE_FORMAT(DATE_ADD(meeting.created_at, INTERVAL 7 HOUR), "%H:00") as hour_only_vn',
                    'COUNT(*) as count'
                ])
                .where('meeting.created_at >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('hour_bucket_vn')
                .orderBy('hour_bucket_vn', 'DESC')
                .getRawMany();

            // 3. LiveKit metrics count
            const totalMetrics24h = await this.livekitMetricRepo.count({
                where: {
                    createdAt: twentyFourHoursAgo as any
                }
            });

            const uniqueMeetingsInMetrics = await this.livekitMetricRepo
                .createQueryBuilder('metric')
                .select('COUNT(DISTINCT metric.meetingId) as unique_meetings')
                .where('metric.createdAt >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .getRawOne();

            // 4. Metrics by hour
            const metricsByHour = await this.livekitMetricRepo
                .createQueryBuilder('metric')
                .select([
                    'DATE_FORMAT(DATE_ADD(metric.createdAt, INTERVAL 7 HOUR), "%Y-%m-%d %H:00:00") as hour_bucket_vn',
                    'DATE_FORMAT(DATE_ADD(metric.createdAt, INTERVAL 7 HOUR), "%H:00") as hour_only_vn',
                    'COUNT(*) as metrics_count',
                    'COUNT(DISTINCT metric.meetingId) as unique_meetings_with_metrics'
                ])
                .where('metric.createdAt >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('hour_bucket_vn')
                .orderBy('hour_bucket_vn', 'DESC')
                .getRawMany();

            // 5. Recent meetings details
            const recentMeetings = await this.meetingRepo.find({
                where: {
                    created_at: twentyFourHoursAgo as any
                },
                order: { created_at: 'DESC' },
                take: 10,
                select: ['id', 'title', 'status', 'created_at', 'started_at', 'current_participants', 'total_participants']
            });

            // 6. Check which meetings have metrics
            const meetingsWithMetrics = await this.meetingRepo
                .createQueryBuilder('meeting')
                .leftJoin('livekit_metrics', 'metric', 'meeting.id = metric.meetingId')
                .select([
                    'meeting.id as meeting_id',
                    'meeting.title',
                    'meeting.status',
                    'meeting.created_at',
                    'COUNT(metric.id) as metrics_count'
                ])
                .where('meeting.created_at >= :twentyFourHoursAgo', { twentyFourHoursAgo })
                .groupBy('meeting.id, meeting.title, meeting.status, meeting.created_at')
                .orderBy('meeting.created_at', 'DESC')
                .getRawMany();

            return {
                analysis_timestamp: now.toISOString(),
                server_timezone_info: {
                    server_time_utc: now.toISOString(),
                    server_time_vietnam: new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                    twenty_four_hours_ago: twentyFourHoursAgo.toISOString()
                },
                summary: {
                    total_meetings_24h: totalMeetings24h,
                    total_metrics_24h: totalMetrics24h, 
                    unique_meetings_with_metrics: parseInt(uniqueMeetingsInMetrics.unique_meetings),
                    meetings_without_metrics: totalMeetings24h - parseInt(uniqueMeetingsInMetrics.unique_meetings)
                },
                breakdown: {
                    meetings_by_hour_utc: meetingsByHourUTC,
                    meetings_by_hour_vietnam: meetingsByHourVN,
                    metrics_by_hour_vietnam: metricsByHour,
                    recent_meetings: recentMeetings.map(m => ({
                        id: m.id.slice(0, 8),
                        title: m.title,
                        status: m.status,
                        created_at: m.created_at,
                        started_at: m.started_at,
                        participants: m.current_participants
                    })),
                    meetings_with_metrics_status: meetingsWithMetrics.map(m => ({
                        meeting_id: m.meeting_id.slice(0, 8),
                        title: m.title,
                        status: m.status,
                        created_at: m.created_at,
                        has_metrics: parseInt(m.metrics_count) > 0,
                        metrics_count: parseInt(m.metrics_count)
                    }))
                },
                possible_dashboard_issues: [
                    "Dashboard may be grouping data differently (UTC vs Vietnam time)",
                    "Different APIs being called for graph vs total count",
                    "Caching layer showing stale data",
                    "Frontend timezone conversion issues",
                    "Dashboard filtering by metrics existence vs all meetings"
                ],
                recommendations: [
                    "Check if dashboard uses server local time or UTC",
                    "Verify which API endpoints dashboard calls",
                    "Clear browser cache and refresh dashboard",
                    "Check if total count includes historical data beyond 24h",
                    "Ensure consistent timezone handling across all components"
                ]
            };

        } catch (error) {
            this.logger.error(`Failed to analyze data inconsistency: ${error.message}`);
            throw error;
        }
    }

    @Get('webhook-health')
    async checkWebhookHealth() {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const recentMetrics = await this.livekitMetricRepo.count({
                where: {
                    createdAt: oneHourAgo as any
                }
            });

            const latestMetric = await this.livekitMetricRepo.findOne({
                order: { createdAt: 'DESC' }
            });

            return {
                webhook_health: {
                    is_receiving_data: recentMetrics > 0,
                    recent_metrics_count: recentMetrics,
                    last_webhook_time: latestMetric?.createdAt || null,
                    minutes_since_last_webhook: latestMetric ? 
                        Math.floor((now.getTime() - new Date(latestMetric.createdAt).getTime()) / 60000) : null
                },
                webhook_url_info: {
                    endpoint: "/webhooks/livekit",
                    accessible_via_ngrok: "https://uninstrumental-edwardo-diplostemonous.ngrok-free.dev/webhooks/livekit",
                    status: "Should be configured in LiveKit Cloud dashboard"
                }
            };

        } catch (error) {
            this.logger.error(`Failed to check webhook health: ${error.message}`);
            throw error;
        }
    }
}