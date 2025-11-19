import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { BandwidthMetric } from './bandwidth-metric.entity';
import { MetricsHourly } from './metrics-hourly.entity';
import { CreateMetricDto } from './dto/create-metric.dto';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(BandwidthMetric)
    private metricsRepo: Repository<BandwidthMetric>,
    @InjectRepository(MetricsHourly)
    private hourlyRepo: Repository<MetricsHourly>,
    private connection: Connection // Inject Connection để dùng QueryBuilder
  ) {}

  // Kỹ thuật 1: KHÔNG TỐT cho metrics
  // Dùng cho logic nghiệp vụ (ví dụ: cập nhật User Profile)
  async badSaveMethod(metricData: CreateMetricDto) {
    const metric = this.metricsRepo.create(metricData);
    // Chạy 1 SELECT (để kiểm tra) + 1 INSERT 
    return this.metricsRepo.save(metric); 
  }

  // Kỹ thuật 2: TỐT HƠN cho 1 record metric mới
  async goodInsertMethod(metricData: CreateMetricDto) {
    // Chỉ chạy 1 INSERT 
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
}