import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { User } from '../../users/user.entity';

import { NotificationGateway } from './notification.gateway';

/**
 * Notification Processor
 * 
 * Worker xử lý jobs gửi notification từ queue
 */
@Processor('notifications')
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationGateway: NotificationGateway,
  ) { }

  @Process('send-notification')
  async handleSendNotification(job: Job<any>) {
    const { notificationId, type, userId, title, message, data } = job.data;
    this.logger.log(`Processing notification ${notificationId} (Type: ${type})`);

    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
        relations: ['user'],
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Get user if not loaded
      if (!notification.user) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });

        if (!user) {
          throw new Error('User not found');
        }

        notification.user = user;
      }

      // Push real-time notification via Socket.IO
      this.notificationGateway.sendNotification(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        action_url: notification.action_url,
        created_at: notification.created_at,
        is_read: notification.is_read,
      });

      switch (type) {
        case NotificationType.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationType.IN_APP:
          // In-app handled via socket above
          break;
        case NotificationType.PUSH:
          await this.sendPush(notification);
          break;
      }

      // Update status to SENT
      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`Notification ${notificationId} sent successfully`);

    } catch (error) {
      this.logger.error(`Failed to process notification ${notificationId}:`, error);
      // Update status to FAILED
      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.FAILED,
      });
      throw error; // Let Bull handle retries
    }
  }

  /**
   * Gửi email notification
   * TODO: Integrate with email service (SendGrid, AWS SES, etc.)
   */
  private async sendEmail(notification: Notification) {
    this.logger.log(`Sending email to ${notification.user.email}: ${notification.title}`);

    // TODO: Implement email sending
    // Example:
    // await this.mailService.send({
    //   to: notification.user.email,
    //   subject: notification.title,
    //   template: 'class-reminder',
    //   context: {
    //     userName: notification.user.username,
    //     title: notification.title,
    //     message: notification.message,
    //     joinUrl: notification.action_url,
    //   },
    // });

    // For now, just log
    this.logger.log(`Email would be sent to ${notification.user.email}`);
  }

  /**
   * Gửi push notification
   * TODO: Integrate with Firebase Cloud Messaging
   */
  private async sendPush(notification: Notification) {
    // TODO: Implement FCM sending
    // if (notification.user.fcm_token) {
    //   await this.firebaseService.sendToDevice(notification.user.fcm_token, {
    //     title: notification.title,
    //     body: notification.message,
    //     data: notification.data,
    //   });
    // }

    this.logger.log(`Push notification would be sent to user ${notification.user.id}`);
  }
}

