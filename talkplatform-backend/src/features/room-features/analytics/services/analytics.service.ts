import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsEvent, EventType } from '../entities/analytics-event.entity';
import { EngagementMetric } from '../entities/engagement-metric.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(EngagementMetric)
    private readonly engagementMetricRepository: Repository<EngagementMetric>,
  ) {}

  /**
   * Track an event
   */
  async trackEvent(
    roomId: string,
    roomType: string,
    userId: string,
    eventType: EventType,
    eventData: Record<string, any> = {},
  ): Promise<void> {
    try {
      const event = this.analyticsEventRepository.create({
        roomId,
        roomType,
        userId,
        eventType,
        eventData,
        timestamp: new Date(),
      });

      await this.analyticsEventRepository.save(event);
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`);
    }
  }

  /**
   * Get room analytics
   */
  async getRoomAnalytics(roomId: string, startDate: Date, endDate: Date) {
    const events = await this.analyticsEventRepository.find({
      where: {
        roomId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // Calculate metrics
    const uniqueUsers = new Set(events.map((e) => e.userId)).size;
    const messageCount = events.filter(
      (e) => e.eventType === EventType.MESSAGE_SENT,
    ).length;
    const handRaiseCount = events.filter(
      (e) => e.eventType === EventType.HAND_RAISED,
    ).length;
    const reactionCount = events.filter(
      (e) => e.eventType === EventType.REACTION_SENT,
    ).length;
    const screenShareCount = events.filter(
      (e) => e.eventType === EventType.SCREEN_SHARED,
    ).length;

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore({
      uniqueUsers,
      messageCount,
      handRaiseCount,
      reactionCount,
      screenShareCount,
      totalEvents: events.length,
    });

    return {
      roomId,
      period: { startDate, endDate },
      metrics: {
        uniqueUsers,
        totalEvents: events.length,
        messageCount,
        handRaiseCount,
        reactionCount,
        screenShareCount,
        engagementScore,
      },
      timeline: this.groupEventsByHour(events),
    };
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(data: {
    uniqueUsers: number;
    messageCount: number;
    handRaiseCount: number;
    reactionCount: number;
    screenShareCount: number;
    totalEvents: number;
  }): number {
    const {
      uniqueUsers,
      messageCount,
      handRaiseCount,
      reactionCount,
      screenShareCount,
      totalEvents,
    } = data;

    // Weighted scoring
    const userScore = Math.min(uniqueUsers * 5, 30); // Max 30 points
    const messageScore = Math.min(messageCount * 0.5, 40); // Max 40 points
    const interactionScore = Math.min(
      (handRaiseCount + reactionCount) * 2,
      20,
    ); // Max 20 points
    const activityScore = Math.min(totalEvents * 0.1, 10); // Max 10 points

    return Math.round(
      userScore + messageScore + interactionScore + activityScore,
    );
  }

  /**
   * Group events by hour
   */
  private groupEventsByHour(events: AnalyticsEvent[]) {
    const grouped = new Map<string, number>();

    events.forEach((event) => {
      const hour = new Date(event.timestamp).toISOString().slice(0, 13);
      grouped.set(hour, (grouped.get(hour) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([hour, count]) => ({
      hour,
      count,
    }));
  }

  /**
   * Generate daily engagement metrics (runs at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyMetrics(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(`Generating daily metrics for ${yesterday.toISOString()}`);

    // Get all rooms active on this date
    const events = await this.analyticsEventRepository.find({
      where: {
        timestamp: Between(yesterday, endOfDay),
      },
    });

    // Group by room
    const roomEvents = new Map<string, AnalyticsEvent[]>();
    events.forEach((event) => {
      if (!roomEvents.has(event.roomId)) {
        roomEvents.set(event.roomId, []);
      }
      roomEvents.get(event.roomId).push(event);
    });

    // Generate metrics for each room
    for (const [roomId, roomEventList] of roomEvents.entries()) {
      const metric = await this.calculateDailyMetric(
        roomId,
        yesterday,
        roomEventList,
      );
      await this.engagementMetricRepository.save(metric);
    }

    this.logger.log(`Daily metrics generated for ${roomEvents.size} rooms`);
  }

  private async calculateDailyMetric(
    roomId: string,
    date: Date,
    events: AnalyticsEvent[],
  ): Promise<EngagementMetric> {
    const uniqueUsers = new Set(events.map((e) => e.userId)).size;
    const messageCount = events.filter(
      (e) => e.eventType === EventType.MESSAGE_SENT,
    ).length;
    const handRaiseCount = events.filter(
      (e) => e.eventType === EventType.HAND_RAISED,
    ).length;
    const reactionCount = events.filter(
      (e) => e.eventType === EventType.REACTION_SENT,
    ).length;
    const screenShareCount = events.filter(
      (e) => e.eventType === EventType.SCREEN_SHARED,
    ).length;

    return this.engagementMetricRepository.create({
      roomId,
      roomType: events[0]?.roomType || 'unknown',
      date,
      totalParticipants: uniqueUsers,
      totalMessages: messageCount,
      totalHandRaises: handRaiseCount,
      totalReactions: reactionCount,
      totalScreenShares: screenShareCount,
      engagementScore: this.calculateEngagementScore({
        uniqueUsers,
        messageCount,
        handRaiseCount,
        reactionCount,
        screenShareCount,
        totalEvents: events.length,
      }),
    });
  }

  /**
   * Get engagement metrics for a room
   */
  async getEngagementMetrics(
    roomId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EngagementMetric[]> {
    return this.engagementMetricRepository.find({
      where: {
        roomId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
  }
}

