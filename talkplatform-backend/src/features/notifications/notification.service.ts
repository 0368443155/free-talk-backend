import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
}

/**
 * Notification Service
 * 
 * Gửi notifications qua queue system (Bull)
 * Tránh block cron job khi gửi email/push
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Gửi notification (Async via Queue)
   */
  async send(dto: SendNotificationDto): Promise<Notification> {
    // 1. Create notification record (Status: PENDING)
    const notification = this.notificationRepository.create({
      user_id: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      action_url: dto.actionUrl,
      status: NotificationStatus.PENDING,
    });

    await this.notificationRepository.save(notification);

    // 2. Add to Queue instead of sending directly
    try {
      await this.notificationQueue.add('send-notification', {
        notificationId: notification.id,
        ...dto,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
      });

      this.logger.log(`Notification ${notification.id} queued successfully`);
    } catch (error) {
      this.logger.error(`Failed to queue notification ${notification.id}:`, error);
      // Update status to FAILED if queueing fails
      notification.status = NotificationStatus.FAILED;
      await this.notificationRepository.save(notification);
      throw error;
    }

    return notification;
  }

  /**
   * Gửi nhiều notifications cùng lúc
   */
  async sendBatch(dtos: SendNotificationDto[]): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const dto of dtos) {
      try {
        const notification = await this.send(dto);
        notifications.push(notification);
      } catch (error) {
        this.logger.error(`Failed to send notification to user ${dto.userId}:`, error);
      }
    }

    return notifications;
  }

  /**
   * Lấy notifications của user
   */
  async getUserNotifications(userId: string, limit: number = 50) {
    return await this.notificationRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Đánh dấu đã đọc
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.is_read = true;
    notification.read_at = new Date();
    await this.notificationRepository.save(notification);

    return notification;
  }

  /**
   * Đánh dấu tất cả đã đọc
   */
  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );
  }

  /**
   * Gửi notification cho admin
   */
  async sendToAdmins(dto: Omit<SendNotificationDto, 'userId'>) {
    // TODO: Get admin users
    // For now, just log
    this.logger.warn(`Admin notification: ${dto.title} - ${dto.message}`);
  }
}

