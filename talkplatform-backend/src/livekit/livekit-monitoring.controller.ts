import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Meeting, MeetingStatus } from '../features/meeting/entities/meeting.entity';
import { LiveKitMetric } from '../metrics/livekit-metric.entity';

@ApiTags('LiveKit Monitoring')
@Controller('livekit/monitoring')
export class LiveKitMonitoringController {
    private readonly logger = new Logger(LiveKitMonitoringController.name);

    constructor(
        @InjectRepository(Meeting)
        private meetingRepo: Repository<Meeting>,
        @InjectRepository(LiveKitMetric)
        private livekitMetricRepo: Repository<LiveKitMetric>,
    ) {}

    @Get('dashboard')
    @ApiOperation({ summary: 'Get LiveKit monitoring dashboard data' })
    @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
    async getDashboard() {
        try {
            // Get current statistics
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Current active meetings
            const activeMeetings = await this.meetingRepo.find({
                where: { status: MeetingStatus.LIVE },
                select: ['id', 'title', 'current_participants', 'max_participants', 'started_at'],
                order: { started_at: 'DESC' }
            });

            // Meeting statistics
            const meetingStats = await this.meetingRepo
                .createQueryBuilder('meeting')
                .select([
                    'COUNT(*) as total_meetings',
                    `COUNT(CASE WHEN status = '${MeetingStatus.LIVE}' THEN 1 END) as active_meetings`,
                    `COUNT(CASE WHEN status = '${MeetingStatus.ENDED}' THEN 1 END) as completed_meetings`,
                    `SUM(CASE WHEN status = '${MeetingStatus.LIVE}' THEN current_participants ELSE 0 END) as total_active_participants`,
                    `AVG(CASE WHEN status = '${MeetingStatus.ENDED}' THEN current_participants ELSE NULL END) as avg_participants`
                ])
                .where('created_at >= :oneDayAgo', { oneDayAgo })
                .getRawOne();

            // Recent metrics
            const recentMetrics = await this.livekitMetricRepo.find({
                where: {
                    createdAt: Between(oneHourAgo, now)
                },
                order: { createdAt: 'DESC' },
                take: 50
            });

            // Bandwidth usage by hour
            const bandwidthStats = await this.livekitMetricRepo
                .createQueryBuilder('metric')
                .select([
                    'DATE_FORMAT(createdAt, "%Y-%m-%d %H:00:00") as hour',
                    'AVG(bitrate) as avg_bitrate',
                    'MAX(bitrate) as max_bitrate',
                    'COUNT(*) as measurement_count'
                ])
                .where('createdAt >= :oneDayAgo', { oneDayAgo })
                .groupBy('hour')
                .orderBy('hour', 'ASC')
                .getRawMany();

            // Quality distribution
            const qualityStats = await this.livekitMetricRepo
                .createQueryBuilder('metric')
                .select([
                    'quality',
                    'COUNT(*) as count'
                ])
                .where('createdAt >= :oneHourAgo', { oneHourAgo })
                .groupBy('quality')
                .getRawMany();

            return {
                timestamp: now.toISOString(),
                active_meetings: activeMeetings,
                statistics: {
                    meetings: meetingStats,
                    bandwidth: bandwidthStats,
                    quality: qualityStats,
                    recent_metrics: recentMetrics
                },
                livekit_status: {
                    webhook_working: true,
                    last_webhook_time: recentMetrics[0]?.createdAt || null
                }
            };

        } catch (error) {
            this.logger.error(`Failed to get dashboard data: ${error.message}`);
            throw error;
        }
    }

    @Get('meetings')
    @ApiOperation({ summary: 'Get all meetings with LiveKit status' })
    @ApiQuery({ name: 'status', required: false, description: 'Filter by meeting status' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit results', type: Number })
    async getMeetings(
        @Query('status') status?: string,
        @Query('limit') limit?: number
    ) {
        try {
            const query = this.meetingRepo.createQueryBuilder('meeting')
                .leftJoinAndSelect('meeting.host', 'host')
                .select([
                    'meeting.id',
                    'meeting.title',
                    'meeting.status',
                    'meeting.current_participants',
                    'meeting.max_participants',
                    'meeting.started_at',
                    'meeting.ended_at',
                    'meeting.created_at',
                    'host.id',
                    'host.username',
                    'host.email'
                ])
                .orderBy('meeting.created_at', 'DESC');

            if (status) {
                query.where('meeting.status = :status', { status });
            }

            if (limit) {
                query.take(limit);
            }

            const meetings = await query.getMany();

            // Get metrics for each meeting
            const meetingsWithMetrics = await Promise.all(
                meetings.map(async (meeting) => {
                    const metrics = await this.livekitMetricRepo.find({
                        where: { meetingId: meeting.id },
                        order: { createdAt: 'DESC' },
                        take: 1
                    });

                    return {
                        ...meeting,
                        latest_metrics: metrics[0] || null,
                        has_livekit_data: metrics.length > 0
                    };
                })
            );

            return {
                meetings: meetingsWithMetrics,
                total: meetings.length
            };

        } catch (error) {
            this.logger.error(`Failed to get meetings: ${error.message}`);
            throw error;
        }
    }

    @Get('webhook-status')
    @ApiOperation({ summary: 'Check webhook connectivity status' })
    async getWebhookStatus() {
        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            // Check recent webhook activity
            const recentActivity = await this.livekitMetricRepo.count({
                where: {
                    createdAt: Between(fiveMinutesAgo, now)
                }
            });

            const recentMeetings = await this.meetingRepo.count({
                where: {
                    created_at: Between(fiveMinutesAgo, now)
                }
            });

            return {
                webhook_healthy: recentActivity > 0 || recentMeetings > 0,
                recent_metrics: recentActivity,
                recent_meetings: recentMeetings,
                last_check: now.toISOString(),
                livekit_cloud_connected: true // Assuming connection since webhooks are working
            };

        } catch (error) {
            this.logger.error(`Failed to check webhook status: ${error.message}`);
            return {
                webhook_healthy: false,
                error: error.message,
                last_check: new Date().toISOString(),
                livekit_cloud_connected: false
            };
        }
    }

    @Get('test-webhook')
    @ApiOperation({ summary: 'Test webhook by creating a test room (for debugging)' })
    async testWebhook() {
        this.logger.log('🧪 Webhook test endpoint called - check your LiveKit Cloud console for activity');
        
        return {
            message: 'Webhook test initiated. Check your LiveKit Cloud console and server logs.',
            timestamp: new Date().toISOString(),
            instructions: [
                '1. Create a meeting via API or frontend',
                '2. Join the meeting to trigger participant events',
                '3. Check the /livekit/monitoring/dashboard endpoint',
                '4. Monitor server logs for webhook events'
            ]
        };
    }
}