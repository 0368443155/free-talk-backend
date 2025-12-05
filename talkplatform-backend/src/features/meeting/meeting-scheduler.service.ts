import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Lesson, LessonStatus } from '../courses/entities/lesson.entity';
import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';

/**
 * Meeting Scheduler Service
 * 
 * Tự động mở/đóng phòng học theo thời gian đã set
 * - Auto mở phòng đúng giờ start_time (cho phép join sớm 10 phút)
 * - Auto đóng phòng sau end_time (grace period 5 phút)
 * - Xử lý cả lessons và bookings
 * - Gửi notifications cho host
 */
@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);

  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * Auto-open meetings mỗi phút
   * Mở phòng khi đến giờ start_time (cho phép join sớm 10 phút)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoOpenMeetings() {
    this.logger.log('Checking for meetings to open...');

    try {
      const now = new Date();
      const gracePeriod = new Date(now.getTime() - 10 * 60 * 1000); // 10 phút trước

      // 1. Xử lý meetings từ lessons
      // Note: scheduled_datetime is a getter, not a column, so we need to calculate it from scheduled_date and start_time
      // Load all scheduled lessons and filter in memory using the getter
      const allLessons = await this.lessonRepository
        .createQueryBuilder('lesson')
        .leftJoinAndSelect('lesson.meeting', 'meeting')
        .where('lesson.status = :scheduled', { scheduled: LessonStatus.SCHEDULED })
        .andWhere('meeting.status = :meetingScheduled', { meetingScheduled: MeetingStatus.SCHEDULED })
        .getMany();

      // Filter lessons where scheduled_datetime is within the grace period
      const lessons = allLessons.filter((lesson) => {
        const scheduledDateTime = lesson.scheduled_datetime;
        return scheduledDateTime >= gracePeriod && scheduledDateTime <= now;
      });

      for (const lesson of lessons) {
        if (lesson.meeting) {
          await this.openMeeting(lesson.meeting, 'lesson');
        }
      }

      // 2. Xử lý meetings từ bookings (teacher classes)
      // Tìm bookings có meeting scheduled_at trong khoảng grace period đến now
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.CONFIRMED,
        },
        relations: ['meeting'],
      });

      for (const booking of bookings) {
        if (!booking.meeting || booking.meeting.status !== MeetingStatus.SCHEDULED) {
          continue;
        }

        const scheduledAt = new Date(booking.scheduled_at);
        // Nếu scheduled_at trong khoảng 10 phút trước đến hiện tại
        if (scheduledAt >= gracePeriod && scheduledAt <= now) {
          await this.openMeeting(booking.meeting, 'booking');
        }
      }

      // 3. Xử lý standalone meetings (không có lesson hoặc booking)
      const standaloneMeetings = await this.meetingRepository
        .createQueryBuilder('meeting')
        .where('meeting.status = :status', { status: MeetingStatus.SCHEDULED })
        .andWhere('meeting.scheduled_at IS NOT NULL')
        .andWhere('meeting.scheduled_at >= :gracePeriod', { gracePeriod })
        .andWhere('meeting.scheduled_at <= :now', { now })
        .getMany();

      for (const meeting of standaloneMeetings) {
        await this.openMeeting(meeting, 'manual');
      }

      this.logger.log('Meeting open check completed');
    } catch (error) {
      this.logger.error('Error checking meetings to open:', error);
    }
  }

  /**
   * Auto-close meetings mỗi phút
   * Đóng phòng sau end_time (grace period 5 phút)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCloseMeetings() {
    this.logger.log('Checking for meetings to close...');

    try {
      const now = new Date();
      const gracePeriod = new Date(now.getTime() - 5 * 60 * 1000); // 5 phút trước

      // 1. Xử lý meetings từ lessons
      const lessons = await this.lessonRepository
        .createQueryBuilder('lesson')
        .leftJoinAndSelect('lesson.meeting', 'meeting')
        .where('lesson.status != :completed', { completed: LessonStatus.COMPLETED })
        .andWhere('meeting.status IN (:...statuses)', {
          statuses: [MeetingStatus.LIVE, MeetingStatus.SCHEDULED],
        })
        .getMany();

      for (const lesson of lessons) {
        if (lesson.meeting && lesson.is_past) {
          // Kiểm tra nếu đã qua end_time + grace period
          const endTime = new Date(lesson.scheduled_datetime);
          endTime.setMinutes(endTime.getMinutes() + (lesson.duration_minutes || 60));

          if (endTime <= gracePeriod) {
            await this.closeMeeting(lesson.meeting, 'lesson', lesson.id);
          }
        }
      }

      // 2. Xử lý meetings từ bookings
      // Tìm bookings có meeting đã qua end_time
      const bookings = await this.bookingRepository.find({
        where: {
          status: BookingStatus.CONFIRMED,
        },
        relations: ['meeting'],
      });

      for (const booking of bookings) {
        if (!booking.meeting || booking.meeting.status === MeetingStatus.ENDED) {
          continue;
        }

        // Tính end_time từ scheduled_at (giả sử duration 60 phút)
        const scheduledAt = new Date(booking.scheduled_at);
        const endTime = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // 60 phút

        // Nếu đã qua end_time + grace period
        if (endTime <= gracePeriod) {
          await this.closeMeeting(booking.meeting, 'booking', booking.id);
        }
      }

      // 3. Xử lý standalone meetings (không có lesson hoặc booking)
      // Đóng meetings đã LIVE và đã qua 60 phút + 5 phút grace period
      const standaloneMeetings = await this.meetingRepository
        .createQueryBuilder('meeting')
        .where('meeting.status = :status', { status: MeetingStatus.LIVE })
        .andWhere('meeting.scheduled_at IS NOT NULL')
        .getMany();

      for (const meeting of standaloneMeetings) {
        const scheduledAt = new Date(meeting.scheduled_at);
        const endTime = new Date(scheduledAt.getTime() + 60 * 60 * 1000); // 60 phút

        // Nếu đã qua end_time + grace period
        if (endTime <= gracePeriod) {
          await this.closeMeeting(meeting, 'manual');
        }
      }

      this.logger.log('Meeting close check completed');
    } catch (error) {
      this.logger.error('Error checking meetings to close:', error);
    }
  }

  /**
   * Mở meeting
   */
  private async openMeeting(meeting: Meeting, source: 'lesson' | 'booking' | 'manual') {
    if (meeting.status === MeetingStatus.LIVE) {
      return; // Đã mở rồi
    }

    this.logger.log(`Opening meeting ${meeting.id} (${source}): ${meeting.title}`);

    const now = new Date();
    const isAuto = source !== 'manual';

    await this.meetingRepository.update(meeting.id, {
      status: MeetingStatus.LIVE,
      started_at: now,
      auto_opened_at: now,
      meeting_state: 'open',
    });

    this.logger.log(`Meeting ${meeting.id} opened successfully (auto: ${isAuto})`);

    // Send notification to host
    const meetingWithHost = await this.meetingRepository.findOne({
      where: { id: meeting.id },
      relations: ['host'],
    });

    if (meetingWithHost?.host) {
      try {
        await this.notificationService.send({
          userId: meetingWithHost.host.id,
          type: NotificationType.IN_APP,
          title: 'Class Started',
          message: `Your class "${meeting.title}" has started automatically.`,
          data: { meetingId: meeting.id },
        });
        this.logger.log(`Notification sent to host ${meetingWithHost.host.id} for meeting ${meeting.id}`);
      } catch (error) {
        this.logger.error(`Failed to send notification for meeting ${meeting.id}:`, error);
      }
    }
  }

  /**
   * Đóng meeting
   */
  private async closeMeeting(meeting: Meeting, source: 'lesson' | 'booking' | 'manual', relatedId?: string) {
    if (meeting.status === MeetingStatus.ENDED) {
      return; // Đã đóng rồi
    }

    this.logger.log(`Closing meeting ${meeting.id} (${source}): ${meeting.title}`);

    const now = new Date();
    const isAuto = source !== 'manual';

    await this.meetingRepository.update(meeting.id, {
      status: MeetingStatus.ENDED,
      ended_at: now,
      auto_closed_at: now,
      meeting_state: 'closed',
    });

    // Update booking status nếu là booking
    if (source === 'booking' && relatedId) {
      await this.bookingRepository.update(relatedId, {
        status: BookingStatus.COMPLETED,
        completed_at: now,
      });
    }

    // Update lesson status nếu là lesson
    if (source === 'lesson' && relatedId) {
      await this.lessonRepository.update(relatedId, {
        status: LessonStatus.COMPLETED,
      });
    }

    this.logger.log(`Meeting ${meeting.id} closed successfully (auto: ${isAuto})`);

    // Send notification to host
    const meetingWithHost = await this.meetingRepository.findOne({
      where: { id: meeting.id },
      relations: ['host'],
    });

    if (meetingWithHost?.host) {
      try {
        await this.notificationService.send({
          userId: meetingWithHost.host.id,
          type: NotificationType.IN_APP,
          title: 'Class Ended',
          message: `Your class "${meeting.title}" has ended automatically.`,
          data: { meetingId: meeting.id },
        });
        this.logger.log(`Notification sent to host ${meetingWithHost.host.id} for meeting ${meeting.id}`);
      } catch (error) {
        this.logger.error(`Failed to send notification for meeting ${meeting.id}:`, error);
      }
    }
  }

  /**
   * Manual trigger để test
   */
  async manualOpenMeeting(meetingId: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    await this.openMeeting(meeting, 'manual');
  }

  /**
   * Manual trigger để test
   */
  async manualCloseMeeting(meetingId: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    await this.closeMeeting(meeting, 'manual');
  }
}

