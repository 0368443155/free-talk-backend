import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson, LessonStatus } from '../courses/entities/lesson.entity';
import { Meeting, MeetingStatus } from './entities/meeting.entity';

@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);

  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
  ) {}

  /**
   * Check and end meetings every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndEndMeetings() {
    this.logger.log('Checking for meetings to end...');

    try {
      // Find lessons that have ended but meeting is still live
      const lessons = await this.lessonRepository
        .createQueryBuilder('lesson')
        .leftJoinAndSelect('lesson.meeting', 'meeting')
        .where('lesson.status != :completed', { completed: LessonStatus.COMPLETED })
        .andWhere('meeting.status = :live', { live: MeetingStatus.LIVE })
        .getMany();

      for (const lesson of lessons) {
        if (lesson.is_past && lesson.meeting) {
          this.logger.log(`Ending meeting for lesson: ${lesson.id}`);

          // End meeting
          await this.meetingRepository.update(lesson.meeting.id, {
            status: MeetingStatus.ENDED,
            ended_at: new Date(),
          });

          // Update lesson status
          await this.lessonRepository.update(lesson.id, {
            status: LessonStatus.COMPLETED,
          });
        }
      }

      this.logger.log('Meeting check completed');
    } catch (error) {
      this.logger.error('Error checking meetings to end:', error);
    }
  }

  /**
   * Auto-start meetings 15 minutes before scheduled time
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndStartMeetings() {
    this.logger.log('Checking for meetings to start...');

    try {
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

      // Find lessons starting soon
      const lessons = await this.lessonRepository
        .createQueryBuilder('lesson')
        .leftJoinAndSelect('lesson.meeting', 'meeting')
        .where('lesson.status = :scheduled', { scheduled: LessonStatus.SCHEDULED })
        .andWhere('meeting.status = :meetingScheduled', { meetingScheduled: MeetingStatus.SCHEDULED })
        .getMany();

      for (const lesson of lessons) {
        const lessonStart = lesson.scheduled_datetime;

        // If lesson starts within 15 minutes, make meeting joinable
        if (lessonStart <= in15Minutes && lessonStart > now) {
          this.logger.log(`Making meeting joinable for lesson: ${lesson.id}`);
          
          // Update meeting to allow joins
          await this.meetingRepository.update(lesson.meeting.id, {
            status: MeetingStatus.LIVE,
            started_at: new Date(),
          });
        }
      }

      this.logger.log('Meeting start check completed');
    } catch (error) {
      this.logger.error('Error checking meetings to start:', error);
    }
  }
}

