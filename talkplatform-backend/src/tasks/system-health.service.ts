import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AppService } from '../app.service';
import * as os from 'os';
import * as process from 'process';
import { Connection } from 'typeorm';

interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  dbConnections: number;
  dbResponseTime: number;
  uptime: number;
  diskUsage?: number;
  networkLatency?: number;
}

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);
  private lastCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
  
  constructor(
    private readonly appService: AppService,
    private readonly connection: Connection
  ) {}

  @Interval(10000) // Chạy mỗi 10 giây
  async collectSystemHealth() {
    try {
      const healthMetrics = await this.getSystemHealthMetrics();
      
      // Debug logging disabled to reduce log noise
      
      // Phát sự kiện system health
      this.appService.addEvent('system-health', healthMetrics);
      
    } catch (error) {
      this.logger.error('Failed to collect system health metrics', error.message);
    }
  }

  private async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // CPU Usage
    const cpuUsage = this.calculateCpuUsage();
    
    // Memory Usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    // Database metrics
    const { dbConnections, dbResponseTime } = await this.getDatabaseMetrics();

    // System uptime
    const uptime = process.uptime();

    return {
      cpuUsage,
      memoryUsage,
      dbConnections,
      dbResponseTime,
      uptime
    };
  }

  private calculateCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();
    
    // Calculate CPU percentage
    const userCpuTime = currentCpuUsage.user;
    const systemCpuTime = currentCpuUsage.system;
    const totalCpuTime = userCpuTime + systemCpuTime;
    
    // Convert microseconds to percentage (approximate)
    const cpuPercent = (totalCpuTime / 1000000) * 100 / 10; // 10 second interval
    
    return Math.min(Math.max(cpuPercent, 0), 100);
  }

  private async getDatabaseMetrics(): Promise<{ dbConnections: number; dbResponseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Simple query to test DB response time
      await this.connection.query('SELECT 1');
      const dbResponseTime = Date.now() - startTime;
      
      // Get active connections (MySQL specific)
      const connectionResult = await this.connection.query('SHOW STATUS LIKE "Threads_connected"');
      const dbConnections = connectionResult[0]?.Value ? parseInt(connectionResult[0].Value) : 0;
      
      return { dbConnections, dbResponseTime };
      
    } catch (error) {
      this.logger.warn('Failed to get database metrics', error.message);
      return { dbConnections: 0, dbResponseTime: 999 };
    }
  }

  // Method để lấy system info on-demand
  async getSystemInfo() {
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown',
      totalMemory: os.totalmem(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      loadAverage: os.loadavg()
    };
  }
}