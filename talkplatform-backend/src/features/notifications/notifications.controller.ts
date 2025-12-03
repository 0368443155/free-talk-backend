import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

/**
 * Notifications Controller
 * 
 * API endpoints cho notifications
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Lấy notifications của user
   */
  @Get()
  async getNotifications(@Request() req, @Query('limit') limit?: number) {
    const userId = req.user.id || req.user.userId;
    return await this.notificationService.getUserNotifications(userId, limit || 50);
  }

  /**
   * Đánh dấu notification đã đọc
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    return await this.notificationService.markAsRead(id, userId);
  }

  /**
   * Đánh dấu tất cả notifications đã đọc
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.id || req.user.userId;
    await this.notificationService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }
}

