# NOTIFICATION SYSTEM - THÔNG BÁO TRƯỚC 20 PHÚT

**Ngày tạo:** 03/12/2025  
**File:** 03_Notification_System.md  
**Thời gian:** 2 ngày

---

## 🎯 MỤC TIÊU

Gửi thông báo cho teacher và students trước 20 phút khi lớp học sắp bắt đầu.

---

## 📋 YÊU CẦU CHỨC NĂNG

### 1. Notification Types
- **Email:** Gửi email reminder (Async via Queue)
- **In-App:** Notification trong app (Real-time via Socket)
- **Push (CRITICAL):** Push notification trên mobile (Firebase Cloud Messaging)

### 2. Architecture Upgrade (Queue System)
- Sử dụng **BullMQ** (Redis) để xử lý việc gửi email/push.
- **Lý do:** Tránh việc gửi email chậm làm block Cron Job (Head-of-line blocking).
- **Flow:** Cron -> Add Job to Queue -> Worker Process -> Send Email/Push.
- Gửi đúng 20 phút trước `start_time`
- Chỉ gửi 1 lần (không duplicate)
- Track notification đã gửi

### 3. Recipients
- **Teacher:** Nhận thông báo về lớp sắp bắt đầu
- **Students:** Chỉ students có booking `CONFIRMED`

---

## 🏗️ KIẾN TRÚC

### Database Schema

```typescript
// File: src/features/notifications/entities/notification.entity.ts

export enum NotificationType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  data: any; // { meetingId, bookingId, etc. }

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

### Tracking Field in Booking

```typescript
// File: src/features/booking/entities/booking.entity.ts

@Entity('bookings')
export class Booking {
  // ... existing fields

  @Column({ type: 'boolean', default: false })
  reminder_sent_20min: boolean; // Đã gửi reminder 20 phút

  @Column({ type: 'timestamp', nullable: true })
  reminder_sent_at: Date;
}
```

---

## 💻 BACKEND IMPLEMENTATION

### 1. Notification Service

```typescript
// File: src/features/notifications/notification.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

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
      status: NotificationStatus.PENDING,
    });

    await this.notificationRepository.save(notification);

    // 2. Add to Queue instead of sending directly
    try {
      await this.notificationQueue.add('send-notification', {
        notificationId: notification.id,
        ...dto
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
}

// File: src/features/notifications/notification.processor.ts
// Worker xử lý job gửi notification

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../../infrastructure/mail/mail.service';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly firebaseService: FirebaseService,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { notificationId, type, userId, title, message, data } = job.data;
    this.logger.log(`Processing notification ${notificationId} (Type: ${type})`);

    try {
      const notification = await this.notificationRepository.findOne({ where: { id: notificationId }, relations: ['user'] });
      if (!notification) throw new Error('Notification not found');

      switch (type) {
        case NotificationType.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationType.IN_APP:
          // In-app handled via socket elsewhere or just DB record is enough
          break;
        case NotificationType.PUSH:
          await this.sendPush(notification);
          break;
      }

      // Update status to SENT
      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();
      await this.notificationRepository.save(notification);

    } catch (error) {
      this.logger.error(`Failed to process notification ${notificationId}:`, error);
      // Update status to FAILED
      await this.notificationRepository.update(notificationId, { status: NotificationStatus.FAILED });
      throw error; // Let BullMQ handle retries
    }
  }

  private async sendEmail(notification: Notification) {
    await this.mailService.send({
      to: notification.user.email,
      subject: notification.title,
      template: 'class-reminder',
      context: {
        userName: notification.user.username,
        title: notification.title,
        message: notification.message,
        joinUrl: `${process.env.FRONTEND_URL}/meetings/${notification.data?.meetingId}`,
      },
    });
  }

  private async sendPush(notification: Notification) {
    // Implement FCM sending
    if (notification.user.fcm_token) {
      await this.firebaseService.sendToDevice(notification.user.fcm_token, {
        title: notification.title,
        body: notification.message,
        data: notification.data,
      });
    }
  }
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
      { is_read: true, read_at: new Date() }
    );
  }
}
```

### 2. Reminder Cron Job

```typescript
// File: src/features/schedules/reminder.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Meeting } from '../meeting/entities/meeting.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Chạy mỗi phút để check meetings cần gửi reminder
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminders() {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 phút sau
    const reminderTimeEnd = new Date(now.getTime() + 21 * 60 * 1000); // 21 phút sau

    // Tìm meetings sẽ bắt đầu trong 20-21 phút
    const meetings = await this.meetingRepository.find({
      where: {
        start_time: Between(reminderTime, reminderTimeEnd),
        state: MeetingState.SCHEDULED,
      },
      relations: ['teacher', 'bookings', 'bookings.student'],
    });

    this.logger.log(`Found ${meetings.length} meetings to send reminders`);

    for (const meeting of meetings) {
      try {
        await this.sendMeetingReminders(meeting);
      } catch (error) {
        this.logger.error(`Failed to send reminders for meeting ${meeting.id}:`, error);
      }
    }
  }

  /**
   * Gửi reminders cho 1 meeting
   */
  private async sendMeetingReminders(meeting: Meeting) {
    this.logger.log(`Sending reminders for meeting ${meeting.id}: ${meeting.title}`);

    // 1. Gửi cho teacher
    await this.notificationService.send({
      userId: meeting.teacher_id,
      type: NotificationType.EMAIL,
      title: '⏰ Class starting in 20 minutes',
      message: `Your class "${meeting.title}" will start in 20 minutes. Please prepare to join.`,
      data: {
        meetingId: meeting.id,
        startTime: meeting.start_time,
      },
    });

    await this.notificationService.send({
      userId: meeting.teacher_id,
      type: NotificationType.IN_APP,
      title: '⏰ Class starting in 20 minutes',
      message: `Your class "${meeting.title}" will start in 20 minutes.`,
      data: {
        meetingId: meeting.id,
        startTime: meeting.start_time,
      },
    });

    // 2. Gửi cho students
    const confirmedBookings = meeting.bookings.filter(
      b => b.status === BookingStatus.CONFIRMED && !b.reminder_sent_20min
    );

    for (const booking of confirmedBookings) {
      // Email
      await this.notificationService.send({
        userId: booking.student_id,
        type: NotificationType.EMAIL,
        title: '⏰ Class starting in 20 minutes',
        message: `The class "${meeting.title}" will start in 20 minutes. Don't miss it!`,
        data: {
          meetingId: meeting.id,
          bookingId: booking.id,
          startTime: meeting.start_time,
        },
      });

      // In-app
      await this.notificationService.send({
        userId: booking.student_id,
        type: NotificationType.IN_APP,
        title: '⏰ Class starting in 20 minutes',
        message: `"${meeting.title}" will start in 20 minutes.`,
        data: {
          meetingId: meeting.id,
          bookingId: booking.id,
          startTime: meeting.start_time,
        },
      });

      // Mark as sent
      booking.reminder_sent_20min = true;
      booking.reminder_sent_at = new Date();
      await this.bookingRepository.save(booking);
    }

    this.logger.log(
      `Sent reminders for meeting ${meeting.id} to teacher and ${confirmedBookings.length} students`
    );
  }
}
```

### 3. Email Template

```html
<!-- File: src/infrastructure/mail/templates/class-reminder.hbs -->

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Class Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
    <h2 style="color: #333;">⏰ Class Starting Soon!</h2>
    
    <p>Hi {{userName}},</p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      {{message}}
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">{{title}}</h3>
      <p><strong>Time:</strong> {{startTime}}</p>
    </div>
    
    <a href="{{joinUrl}}" 
       style="display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
      Join Class Now
    </a>
    
    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      See you in class!<br>
      4Talk Team
    </p>
  </div>
</body>
</html>
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Notification API

```typescript
// File: api/notifications.ts

export const notificationApi = {
  getNotifications: async (limit: number = 50) => {
    const response = await axios.get(`/api/v1/notifications?limit=${limit}`);
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await axios.patch(`/api/v1/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await axios.patch('/api/v1/notifications/read-all');
    return response.data;
  },
};
```

### 2. Notification Component

```tsx
// File: components/notifications/NotificationBell.tsx

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import useSWR from 'swr';
import { notificationApi } from '@/api/notifications';

export function NotificationBell() {
  const { data: notifications, mutate } = useSWR(
    '/notifications',
    () => notificationApi.getNotifications()
  );

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationApi.markAsRead(notificationId);
    mutate();
  };

  const handleMarkAllAsRead = async () => {
    await notificationApi.markAllAsRead();
    mutate();
  };

  return (
    <div className="relative">
      <button className="relative p-2 hover:bg-gray-100 rounded-full">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications?.map(notification => (
            <div
              key={notification.id}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                !notification.is_read ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3. Real-time Updates (Socket)

```typescript
// File: hooks/useNotifications.ts

import { useEffect } from 'react';
import { useSocket } from './useSocket';
import useSWR from 'swr';

export function useNotifications() {
  const socket = useSocket();
  const { data, mutate } = useSWR('/notifications');

  useEffect(() => {
    if (!socket) return;

    socket.on('new_notification', (notification) => {
      // Add new notification to list
      mutate(prev => [notification, ...(prev || [])], false);
      
      // Show toast
      toast.info(notification.title);
    });

    return () => {
      socket.off('new_notification');
    };
  }, [socket, mutate]);

  return { notifications: data, mutate };
}
```

---

## 🧪 TESTING

### Manual Test

```bash
# 1. Tạo meeting sẽ bắt đầu sau 20 phút
POST /api/v1/meetings
{
  "title": "Test Class",
  "start_time": "2025-12-03T12:20:00Z", # 20 phút sau
  "end_time": "2025-12-03T13:20:00Z"
}

# 2. Tạo booking
POST /api/v1/bookings
{
  "meeting_id": "xxx",
  "student_id": "yyy"
}

# 3. Đợi 1 phút (cron job chạy)
# Check email và in-app notifications
```

---

## 📊 MONITORING

### Metrics
- Number of reminders sent per day
- Email delivery rate
- Notification read rate
- Failed notifications

### Logs
```
[ReminderService] Found 5 meetings to send reminders
[ReminderService] Sending reminders for meeting abc-123
[NotificationService] Notification xyz-456 sent successfully
[ReminderService] Sent reminders to teacher and 3 students
```

---

**Next:** `04_Refund_Logic.md`
