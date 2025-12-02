import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface UserMetrics {
  uploadBitrate?: number;
  downloadBitrate?: number;
  latency?: number;
  quality?: string;
  usingRelay?: boolean;
  packetLoss?: number;
}

interface Alert {
  type: string;
  severity: string;
  message: string;
  cost?: boolean;
}

interface SocketWithUser extends Socket {
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/meeting-metrics',
  cors: { 
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3051'],
    credentials: true,
  },
})
@Injectable()
export class MeetingMetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(MeetingMetricsGateway.name);
  private lastBroadcast = new Map<string, number>();
  private readonly BROADCAST_THROTTLE = 2000; // 2 seconds
  
  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}
  
  handleConnection(client: SocketWithUser) {
    this.logger.log(`Client connected: ${client.id}`);
    // Extract userId from handshake auth if available
    const userId = (client.handshake.auth as any)?.userId || client.id;
    client.data.userId = userId;
  }
  
  handleDisconnect(client: SocketWithUser) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
  
  @SubscribeMessage('meeting:metrics')
  async handleMetrics(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: {
      meetingId: string;
      metrics: Partial<UserMetrics>;
      isFullState?: boolean;
      timestamp: number;
    },
  ) {
    const { meetingId, metrics, isFullState } = data;
    const userId = client.data.userId || client.id;
    
    // Check if metrics object is empty (delta compression sent nothing)
    const hasMetrics = metrics && Object.keys(metrics).length > 0;
    
    this.logger.log(`📊 Received metrics from user ${userId} in meeting ${meetingId}`, {
      hasMetrics,
      metricsKeys: metrics ? Object.keys(metrics) : [],
      isFullState,
      socketId: client.id,
    });
    
    // If delta is empty and not full state, skip processing
    if (!hasMetrics && !isFullState) {
      this.logger.debug(`⏸️ Skipping empty delta update for user ${userId}`);
      return;
    }
    
    try {
      // 1. Merge with existing metrics in Redis (delta update)
      const existingMetrics = await this.getExistingMetrics(meetingId, userId);
      const mergedMetrics = { ...existingMetrics, ...metrics };
      
      // 2. Store in Redis (TTL: 5 minutes)
      await this.redis.set(
        `meeting:${meetingId}:user:${userId}:metrics`,
        JSON.stringify(mergedMetrics),
        'EX',
        300,
      );
      
      this.logger.debug(`✅ Stored metrics in Redis for user ${userId}`, {
        upload: mergedMetrics.uploadBitrate,
        download: mergedMetrics.downloadBitrate,
        quality: mergedMetrics.quality,
      });
      
      // 3. Check for alerts (immediate)
      await this.checkAlerts(meetingId, userId, mergedMetrics);
      
      // 4. Throttled broadcast to admin (2s interval) - only if we have actual metrics
      if (hasMetrics || isFullState) {
        await this.throttledBroadcast(meetingId, userId, mergedMetrics);
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to handle metrics:', error);
    }
  }
  
  @SubscribeMessage('admin:subscribe')
  handleAdminSubscribe(@ConnectedSocket() client: SocketWithUser) {
    client.join('admin-dashboard');
    this.logger.log(`Admin subscribed: ${client.id}`);
  }
  
  @SubscribeMessage('admin:unsubscribe')
  handleAdminUnsubscribe(@ConnectedSocket() client: SocketWithUser) {
    client.leave('admin-dashboard');
    this.logger.log(`Admin unsubscribed: ${client.id}`);
  }
  
  private async getExistingMetrics(meetingId: string, userId: string): Promise<UserMetrics> {
    const data = await this.redis.get(`meeting:${meetingId}:user:${userId}:metrics`);
    return data ? JSON.parse(data) : {};
  }
  
  private async throttledBroadcast(
    meetingId: string,
    userId: string,
    metrics: UserMetrics,
  ) {
    const key = `${meetingId}:${userId}`;
    const now = Date.now();
    const lastTime = this.lastBroadcast.get(key) || 0;
    
    // Only broadcast if 2 seconds passed
    if (now - lastTime > this.BROADCAST_THROTTLE) {
      // Try to get admin count (handle different Socket.IO adapter structures)
      let adminCount = 0;
      try {
        const adapter = (this.server as any).sockets?.adapter || (this.server as any).adapter;
        if (adapter && adapter.rooms) {
          const adminRoom = adapter.rooms.get('admin-dashboard');
          adminCount = adminRoom ? adminRoom.size : 0;
        }
      } catch (error) {
        // If we can't get count, just broadcast anyway
        this.logger.debug('Could not get admin count, broadcasting anyway');
      }
      
      this.logger.log(`📡 Broadcasting to admin-dashboard room`, {
        meetingId,
        userId,
        adminCount,
        upload: metrics.uploadBitrate,
        download: metrics.downloadBitrate,
        quality: metrics.quality,
      });
      
      // Always emit - Socket.IO will handle if no one is listening
      this.server.to('admin-dashboard').emit('meeting:metrics:update', {
        meetingId,
        userId,
        metrics,
        timestamp: now,
      });
      
      this.lastBroadcast.set(key, now);
    } else {
      this.logger.debug(`⏸️ Throttled broadcast for ${key} (${now - lastTime}ms < ${this.BROADCAST_THROTTLE}ms)`);
    }
  }
  
  private async checkAlerts(meetingId: string, userId: string, metrics: UserMetrics) {
    const alerts: Alert[] = [];
    
    // High latency
    if (metrics.latency && metrics.latency > 300) {
      alerts.push({
        type: 'high-latency',
        severity: 'warning',
        message: `User ${userId} has high latency: ${metrics.latency}ms`,
      });
    }
    
    // High packet loss
    if (metrics.packetLoss && metrics.packetLoss > 5) {
      alerts.push({
        type: 'packet-loss',
        severity: 'warning',
        message: `User ${userId} has high packet loss: ${metrics.packetLoss}%`,
      });
    }
    
    // TURN relay (cost!)
    if (metrics.usingRelay) {
      alerts.push({
        type: 'using-turn',
        severity: 'info',
        message: `User ${userId} is using TURN relay (bandwidth cost)`,
        cost: true,
      });
    }
    
    // Poor connection
    if (metrics.quality === 'poor') {
      alerts.push({
        type: 'poor-connection',
        severity: 'critical',
        message: `User ${userId} has poor connection quality`,
      });
    }
    
    if (alerts.length > 0) {
      // Immediate broadcast (no throttle for alerts)
      this.server.to('admin-dashboard').emit('meeting:alerts', {
        meetingId,
        userId,
        alerts,
        timestamp: Date.now(),
      });
      
      this.logger.warn(`Alerts triggered for user ${userId}:`, alerts);
    }
  }
}

