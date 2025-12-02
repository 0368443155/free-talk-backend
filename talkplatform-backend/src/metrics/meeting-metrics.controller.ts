import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import Redis from 'ioredis';

@Controller('api/v1/metrics/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MeetingMetricsController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}
  
  /**
   * Get active meetings
   */
  @Get('active')
  async getActiveMeetings() {
    const keys = await this.redis.keys('meeting:*:user:*:metrics');
    const meetings = new Map<string, any>();
    
    for (const key of keys) {
      const parts = key.split(':');
      const meetingId = parts[1];
      const userId = parts[3];
      
      const data = await this.redis.get(key);
      if (!data) continue;
      
      const metrics = JSON.parse(data);
      
      if (!meetings.has(meetingId)) {
        meetings.set(meetingId, {
          meetingId,
          users: [],
        });
      }
      
      meetings.get(meetingId).users.push({
        userId,
        ...metrics,
      });
    }
    
    return Array.from(meetings.values());
  }
  
  /**
   * Get meeting by ID
   */
  @Get(':id')
  async getMeeting(@Query('id') meetingId: string) {
    const keys = await this.redis.keys(`meeting:${meetingId}:user:*:metrics`);
    const users: any[] = [];
    
    for (const key of keys) {
      const userId = key.split(':')[3];
      const data = await this.redis.get(key);
      
      if (data) {
        users.push({
          userId,
          ...JSON.parse(data),
        });
      }
    }
    
    return {
      meetingId,
      users,
    };
  }
  
  /**
   * Get TURN usage statistics
   */
  @Get('stats/turn')
  async getTurnStats() {
    const keys = await this.redis.keys('meeting:*:user:*:metrics');
    let totalUsers = 0;
    let turnUsers = 0;
    
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (!data) continue;
      
      totalUsers++;
      const metrics = JSON.parse(data);
      if (metrics.usingRelay) {
        turnUsers++;
      }
    }
    
    return {
      totalUsers,
      turnUsers,
      turnPercentage: totalUsers > 0 ? (turnUsers / totalUsers) * 100 : 0,
      estimatedCostPerHour: turnUsers * 0.05, // $0.05/user/hour
    };
  }
}

