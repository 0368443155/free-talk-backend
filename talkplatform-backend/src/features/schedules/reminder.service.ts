import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { Meeting, MeetingStatus } from '../meeting/entities/meeting.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';

/**
 * Reminder Service
 * 
 * Gửi reminder 20 phút trước khi lớp học bắt đầu
 * Chạy mỗi phút để check meetings cần gửi reminder
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Chạy mỗi phút để check meetings cần gửi reminder
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminders() {
    this.logger.log('Checking for meetings to send reminders...');

    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 phút sau
      const reminderTimeEnd = new Date(now.getTime() + 21 * 60 * 1000); // 21 phút sau

      // Tìm bookings sẽ bắt đầu trong 20-21 phút
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.CONFIRMED,
          scheduled_at: Between(reminderTime, reminderTimeEnd),
          reminder_sent_20min: false, // Chưa gửi reminder
        },
        relations: ['meeting', 'student', 'teacher'],
      });

      this.logger.log(`Found ${bookings.length} bookings to send reminders`);

      for (const booking of bookings) {
        try {
          await this.sendBookingReminders(booking);
        } catch (error) {
          this.logger.error(`Failed to send reminders for booking ${booking.id}:`, error);
        }
      }

      // Tìm meetings từ lessons (nếu có)
      const meetings = await this.meetingRepository.find({
        where: {
          status: MeetingStatus.SCHEDULED,
          scheduled_at: Between(reminderTime, reminderTimeEnd),
        },
        relations: ['host', 'lesson'],
      });

      for (const meeting of meetings) {
        if (meeting.lesson) {
          try {
            await this.sendLessonReminders(meeting);
          } catch (error) {
            this.logger.error(`Failed to send reminders for meeting ${meeting.id}:`, error);
          }
        }
      }

      this.logger.log('Reminder check completed');
    } catch (error) {
      this.logger.error('Error checking reminders:', error);
    }
  }

  /**
   * Gửi reminders cho booking (teacher class)
   */
  private async sendBookingReminders(booking: Booking) {
    this.logger.log(`Sending reminders for booking ${booking.id}`);

    const meeting = booking.meeting;
    if (!meeting) {
      this.logger.warn(`Booking ${booking.id} has no meeting`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const joinUrl = `${frontendUrl}/meetings/${meeting.id}`;

    // 1. Gửi cho teacher
    await this.notificationService.send({
      userId: booking.teacher_id,
      type: NotificationType.EMAIL,
      title: '⏰ Class starting in 20 minutes',
      message: `Your class "${meeting.title || 'Class'}" will start in 20 minutes. Please prepare to join.`,
      data: {
        meetingId: meeting.id,
        bookingId: booking.id,
        startTime: booking.scheduled_at,
      },
      actionUrl: joinUrl,
    });

    await this.notificationService.send({
      userId: booking.teacher_id,
      type: NotificationType.IN_APP,
      title: '⏰ Class starting in 20 minutes',
      message: `Your class "${meeting.title || 'Class'}" will start in 20 minutes.`,
      data: {
        meetingId: meeting.id,
        bookingId: booking.id,
        startTime: booking.scheduled_at,
      },
      actionUrl: joinUrl,
    });

    // 2. Gửi cho student
    await this.notificationService.send({
      userId: booking.student_id,
      type: NotificationType.EMAIL,
      title: '⏰ Class starting in 20 minutes',
      message: `The class "${meeting.title || 'Class'}" will start in 20 minutes. Don't miss it!`,
      data: {
        meetingId: meeting.id,
        bookingId: booking.id,
        startTime: booking.scheduled_at,
      },
      actionUrl: joinUrl,
    });

    await this.notificationService.send({
      userId: booking.student_id,
      type: NotificationType.IN_APP,
      title: '⏰ Class starting in 20 minutes',
      message: `"${meeting.title || 'Class'}" will start in 20 minutes.`,
      data: {
        meetingId: meeting.id,
        bookingId: booking.id,
        startTime: booking.scheduled_at,
      },
      actionUrl: joinUrl,
    });

    // Mark as sent
    booking.reminder_sent_20min = true;
    booking.reminder_sent_at = new Date();
    await this.bookingRepository.save(booking);

    this.logger.log(
      `Sent reminders for booking ${booking.id} to teacher and student`,
    );
  }

  /**
   * Gửi reminders cho lesson meeting
   */
  private async sendLessonReminders(meeting: Meeting) {
    this.logger.log(`Sending reminders for lesson meeting ${meeting.id}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const joinUrl = `${frontendUrl}/meetings/${meeting.id}`;

    // Gửi cho teacher/host
    if (meeting.host) {
      await this.notificationService.send({
        userId: meeting.host.id,
        type: NotificationType.EMAIL,
        title: '⏰ Class starting in 20 minutes',
        message: `Your class "${meeting.title}" will start in 20 minutes. Please prepare to join.`,
        data: {
          meetingId: meeting.id,
          startTime: meeting.scheduled_at,
        },
        actionUrl: joinUrl,
      });

      await this.notificationService.send({
        userId: meeting.host.id,
        type: NotificationType.IN_APP,
        title: '⏰ Class starting in 20 minutes',
        message: `Your class "${meeting.title}" will start in 20 minutes.`,
        data: {
          meetingId: meeting.id,
          startTime: meeting.scheduled_at,
        },
        actionUrl: joinUrl,
      });
    }

    // TODO: Gửi cho students enrolled in lesson
    // Cần query enrollments từ course/session
  }
}

