import { Injectable, Logger } from '@nestjs/common';
import { Interval, Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Connection } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  
  constructor(
    private readonly httpService: HttpService,
    private readonly appService: AppService,
    private readonly connection: Connection,
    private readonly configService: ConfigService
  ) {}

  @Interval(3600000) // Chạy mỗi giờ
  async handleDataAggregation() {
    this.logger.log('Running hourly data aggregation task...');
    
    // Kỹ thuật: Chạy một truy vấn SQL tổng hợp (aggregate query)
    // và lưu vào một bảng khác (ví dụ: 'metrics_hourly')
    try {
      await this.connection.query(`
        INSERT INTO metrics_hourly (endpoint, avgResponseTime, totalInboundBytes, totalOutboundBytes, requestCount, maxActiveConnections, avgBandwidthUsage, timestamp)
        SELECT 
          endpoint, 
          AVG(responseTimeMs) as avgResponseTime,
          SUM(inboundBytes) as totalInboundBytes,
          SUM(outboundBytes) as totalOutboundBytes,
          COUNT(*) as requestCount,
          MAX(activeConnections) as maxActiveConnections,
          AVG(inboundBytes + outboundBytes) as avgBandwidthUsage,
          NOW() as timestamp
        FROM bandwidth_metrics
        WHERE timestamp >= NOW() - INTERVAL 1 HOUR
        GROUP BY endpoint
      `);
      this.logger.log('Hourly aggregation complete.');
    } catch (e) {
      this.logger.error('Hourly aggregation failed', e.stack);
    }
  }

  @Interval(5000) // Chạy mỗi 5 giây
  async pushSystemMetricsToWebSocket() {
    try {
      // Check if table exists first
      const tableExists = await this.connection.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'bandwidth_metrics'
      `);

      if (!tableExists || tableExists[0]?.count === 0) {
        this.logger.warn('bandwidth_metrics table does not exist, skipping metrics collection');
        return;
      }

      // Lấy metrics thời gian thực từ database
      const realtimeMetrics = await this.connection.query(`
        SELECT 
          SUM(inboundBytes + outboundBytes) as totalBandwidth,
          COUNT(DISTINCT userId) as activeUsers,
          MAX(activeConnections) as currentConnections,
          AVG(responseTimeMs) as avgResponseTime
        FROM bandwidth_metrics 
        WHERE timestamp >= NOW() - INTERVAL 1 MINUTE
      `);

      const systemStats = realtimeMetrics[0];
      
      if (systemStats) {
        this.logger.debug(`System metrics: ${JSON.stringify(systemStats)}`);
        
        // Phát sự kiện qua Event Bus
        this.appService.addEvent('system-metrics', {
          totalBandwidth: systemStats.totalBandwidth || 0,
          activeUsers: systemStats.activeUsers || 0,
          currentConnections: systemStats.currentConnections || 0,
          avgResponseTime: systemStats.avgResponseTime || 0,
          timestamp: new Date()
        });
      }
    } catch (error) {
      // Only log error if it's not a "table doesn't exist" error
      if (error.message && !error.message.includes("doesn't exist")) {
        this.logger.error('Failed to collect system metrics', error.message);
      }
    }
  }

  @Cron('0 0 * * *') // Chạy mỗi ngày lúc 00:00
  async cleanOldMetrics() {
    this.logger.log('Cleaning old metrics...');
    
    try {
      // Xóa metrics cũ hơn 7 ngày
      const result = await this.connection.query(`
        DELETE FROM bandwidth_metrics 
        WHERE timestamp < NOW() - INTERVAL 7 DAY
      `);
      
      this.logger.log(`Cleaned ${result.affectedRows} old metric records`);
    } catch (e) {
      this.logger.error('Failed to clean old metrics', e.stack);
    }
  }

  // Phương thức để gửi sự kiện thông báo
  notifyAdminDashboard(eventName: string, data: any) {
    this.appService.addEvent(eventName, data);
  }
}