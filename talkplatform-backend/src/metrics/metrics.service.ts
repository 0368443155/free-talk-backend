import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, MoreThan } from 'typeorm';
import { BandwidthMetric } from './bandwidth-metric.entity';
import { MetricsHourly } from './metrics-hourly.entity';
import { LiveKitMetric } from './livekit-metric.entity';
import { CreateMetricDto } from './dto/create-metric.dto';
import { CreateLiveKitMetricDto } from './dto/livekit-metric.dto';
import { BandwidthRedisService } from './services/bandwidth-redis.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(BandwidthMetric)
    private metricsRepo: Repository<BandwidthMetric>,
    @InjectRepository(MetricsHourly)
    private hourlyRepo: Repository<MetricsHourly>,
    @InjectRepository(LiveKitMetric)
    private liveKitMetricsRepo: Repository<LiveKitMetric>,
    private connection: Connection, // Inject Connection để dùng QueryBuilder
    private readonly bandwidthRedisService: BandwidthRedisService, // Inject Redis service
  ) {}

  // Kỹ thuật 1: KHÔNG TỐT cho metrics
  // Dùng cho logic nghiệp vụ (ví dụ: cập nhật User Profile)
  async badSaveMethod(metricData: CreateMetricDto) {
    const metric = this.metricsRepo.create(metricData);
    // Chạy 1 SELECT (để kiểm tra) + 1 INSERT 
    return this.metricsRepo.save(metric); 
  }

  // Kỹ thuật 2: TỐT HƠN cho 1 record metric mới
  // Now with Redis caching for real-time access
  async goodInsertMethod(metricData: CreateMetricDto) {
    // Store in Redis first (for real-time access)
    await this.bandwidthRedisService.storeMetric(metricData);
    
    // Then store in MySQL (for persistence)
    return this.metricsRepo.insert({
      ...metricData,
      timestamp: new Date()
    }); 
  }

  // Kỹ thuật 3: TỐI ƯU cho ghi hàng loạt (bulk ingestion)
  async bestBulkInsertMethod(metricsData: CreateMetricDto[]) {
    if (metricsData.length === 0) {
      return;
    }

    // Sử dụng QueryBuilder để tạo một câu lệnh INSERT đa giá trị
    // (ví dụ: INSERT INTO... VALUES (...), (...), (...))
    // Đây là cách nhanh nhất để nhập dữ liệu vào MySQL.
    const dataWithTimestamp = metricsData.map(data => ({
      ...data,
      timestamp: new Date()
    }));

    return this.connection.createQueryBuilder()
     .insert()
     .into(BandwidthMetric)
     .values(dataWithTimestamp)
     .execute();
  }

  // Lấy dữ liệu đã tổng hợp theo giờ
  async getHourlyMetrics(hours: number = 24) {
    return this.connection.query(`
      SELECT * FROM metrics_hourly 
      WHERE timestamp >= NOW() - INTERVAL ? HOUR
      ORDER BY timestamp DESC
    `, [hours]);
  }

  // Lấy metrics thời gian thực (5 phút gần nhất)
  async getRealtimeMetrics() {
    return this.connection.query(`
      SELECT 
        endpoint,
        SUM(inboundBytes) as totalInbound,
        SUM(outboundBytes) as totalOutbound,
        AVG(responseTimeMs) as avgResponseTime,
        COUNT(*) as requestCount,
        MAX(activeConnections) as maxConnections
      FROM bandwidth_metrics 
      WHERE timestamp >= NOW() - INTERVAL 5 MINUTE
      GROUP BY endpoint
      ORDER BY totalInbound + totalOutbound DESC
    `);
  }

  // Lấy tổng quan hệ thống
  async getSystemOverview() {
    const results = await this.connection.query(`
      SELECT 
        SUM(inboundBytes) as totalInbound,
        SUM(outboundBytes) as totalOutbound,
        AVG(responseTimeMs) as avgResponseTime,
        COUNT(*) as totalRequests,
        MAX(activeConnections) as peakConnections,
        COUNT(DISTINCT userId) as activeUsers
      FROM bandwidth_metrics 
      WHERE timestamp >= NOW() - INTERVAL 1 HOUR
    `);

    return results[0];
  }

  // LiveKit Metrics Methods
  async createLiveKitMetric(metricData: CreateLiveKitMetricDto) {
    try {
      // Use efficient insert for real-time metrics
      const result = await this.liveKitMetricsRepo.insert({
        meetingId: metricData.meetingId,
        userId: metricData.userId,
        platform: metricData.platform,
        timestamp: metricData.timestamp,
        bitrate: metricData.bitrate,
        packetLoss: metricData.packetLoss,
        jitter: metricData.jitter,
        rtt: metricData.rtt,
        quality: metricData.quality,
      });

      this.logger.debug(`LiveKit metric saved for user ${metricData.userId} in meeting ${metricData.meetingId}`);
      return { success: true, id: result.identifiers[0]?.id };
    } catch (error) {
      this.logger.error(`Failed to save LiveKit metric: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getLiveKitDashboardMetrics(meetingId?: string) {
    try {
      // Get metrics for the last hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      let query = this.connection.createQueryBuilder(LiveKitMetric, 'lm')
        .where('lm.timestamp >= :timestamp', { timestamp: oneHourAgo });

      if (meetingId) {
        query = query.andWhere('lm.meetingId = :meetingId', { meetingId });
      }

      const metrics = await query
        .orderBy('lm.timestamp', 'DESC')
        .limit(1000) // Limit for performance
        .getRawMany();

      // Calculate aggregated statistics
      const stats = await this.calculateLiveKitStats(meetingId, oneHourAgo);

      // Get real-time connection quality distribution
      const qualityDistribution = await this.getLiveKitQualityDistribution(meetingId);

      // Get active meetings with LiveKit
      const activeMeetings = await this.getActiveLiveKitMeetings();

      return {
        metrics,
        stats,
        qualityDistribution,
        activeMeetings,
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logger.error(`Failed to get LiveKit dashboard metrics: ${error.message}`);
      throw error;
    }
  }

  private async calculateLiveKitStats(meetingId?: string, since: number = Date.now() - 3600000) {
    let query = `
      SELECT 
        AVG(bitrate) as avgBitrate,
        MIN(bitrate) as minBitrate,
        MAX(bitrate) as maxBitrate,
        AVG(packetLoss) as avgPacketLoss,
        MAX(packetLoss) as maxPacketLoss,
        AVG(jitter) as avgJitter,
        AVG(rtt) as avgRtt,
        COUNT(*) as totalMeasurements,
        COUNT(DISTINCT userId) as uniqueUsers,
        COUNT(DISTINCT meetingId) as uniqueMeetings
      FROM livekit_metrics 
      WHERE timestamp >= ?
    `;

    const params: any[] = [since];

    if (meetingId) {
      query += ' AND meetingId = ?';
      params.push(meetingId);
    }

    const result = await this.connection.query(query, params);
    return result[0];
  }

  private async getLiveKitQualityDistribution(meetingId?: string) {
    let query = `
      SELECT 
        quality,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
      FROM livekit_metrics 
      WHERE timestamp >= ?
    `;

    const params: any[] = [Date.now() - 300000]; // Last 5 minutes

    if (meetingId) {
      query += ' AND meetingId = ?';
      params.push(meetingId);
    }

    query += ' GROUP BY quality ORDER BY count DESC';

    return this.connection.query(query, params);
  }

  private async getActiveLiveKitMeetings() {
    // Get meetings with recent LiveKit activity (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;

    const query = `
      SELECT 
        meetingId,
        COUNT(DISTINCT userId) as participantCount,
        AVG(bitrate) as avgBitrate,
        AVG(CASE WHEN quality = 'excellent' THEN 4 
                 WHEN quality = 'good' THEN 3
                 WHEN quality = 'fair' THEN 2
                 WHEN quality = 'poor' THEN 1 
                 ELSE 0 END) as avgQualityScore,
        MAX(timestamp) as lastActivity
      FROM livekit_metrics 
      WHERE timestamp >= ?
      GROUP BY meetingId
      HAVING lastActivity >= ?
      ORDER BY participantCount DESC, avgQualityScore DESC
    `;

    return this.connection.query(query, [fiveMinutesAgo, fiveMinutesAgo]);
  }

  // Bulk insert for high-frequency LiveKit metrics
  async bulkCreateLiveKitMetrics(metricsData: CreateLiveKitMetricDto[]) {
    if (metricsData.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const dataForInsert = metricsData.map(data => ({
        meetingId: data.meetingId,
        userId: data.userId,
        platform: data.platform,
        timestamp: data.timestamp,
        bitrate: data.bitrate,
        packetLoss: data.packetLoss,
        jitter: data.jitter,
        rtt: data.rtt,
        quality: data.quality,
      }));

      const result = await this.connection.createQueryBuilder()
        .insert()
        .into(LiveKitMetric)
        .values(dataForInsert)
        .execute();

      this.logger.debug(`Bulk inserted ${metricsData.length} LiveKit metrics`);
      return { success: true, count: metricsData.length };
    } catch (error) {
      this.logger.error(`Failed to bulk insert LiveKit metrics: ${error.message}`);
      return { success: false, error: error.message, count: 0 };
    }
  }
}