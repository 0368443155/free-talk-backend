import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Not, In } from 'typeorm';
import { Meeting, MeetingStatus, MeetingType } from '../entities/meeting.entity';
import { Lesson } from '../../courses/entities/lesson.entity';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class ScheduleAutomationService {
    private readonly logger = new Logger(ScheduleAutomationService.name);

    constructor(
        @InjectRepository(Meeting)
        private readonly meetingRepository: Repository<Meeting>,
        @InjectRepository(Lesson)
        private readonly lessonRepository: Repository<Lesson>,
        private readonly notificationService: NotificationService,
    ) { }

    /**
     * Auto-open meetings that are scheduled to start soon
     * Runs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleMeetingAutoOpen() {
        this.logger.log('Checking for meetings to auto-open...');

        const now = new Date();
        // Open 15 minutes before schedule
        const openThreshold = new Date(now.getTime() + 15 * 60000);

        // Find scheduled meetings that should be opened
        // Logic: scheduled_at <= openThreshold AND status = SCHEDULED
        const meetingsToOpen = await this.meetingRepository.find({
            where: {
                status: MeetingStatus.SCHEDULED,
                scheduled_at: LessThanOrEqual(openThreshold),
                meeting_state: 'scheduled', // Phase 1 field
            },
            relations: ['host'],
        });

        if (meetingsToOpen.length === 0) {
            return;
        }

        this.logger.log(`Found ${meetingsToOpen.length} meetings to open`);

        for (const meeting of meetingsToOpen) {
            try {
                // Update meeting status
                meeting.status = MeetingStatus.LIVE;
                meeting.meeting_state = 'open';
                meeting.auto_opened_at = new Date();

                await this.meetingRepository.save(meeting);
                this.logger.log(`Auto-opened meeting ${meeting.id} (${meeting.title})`);

                // Send notification to host
                if (meeting.host) {
                    await this.notificationService.send({
                        userId: meeting.host.id,
                        type: NotificationType.IN_APP,
                        title: 'Class Started',
                        message: `Your class "${meeting.title}" has started automatically.`,
                        data: { meetingId: meeting.id },
                    });
                }
            } catch (error) {
                this.logger.error(`Failed to auto-open meeting ${meeting.id}: ${error.message}`);
            }
        }
    }

    /**
     * Auto-close meetings that have ended
     * Runs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleMeetingAutoClose() {
        this.logger.log('Checking for meetings to auto-close...');

        const now = new Date();

        // Find LIVE meetings that might need closing
        const liveMeetings = await this.meetingRepository.find({
            where: {
                status: MeetingStatus.LIVE,
                meeting_state: In(['open', 'in_progress']),
                lesson_id: Not(IsNull()), // Only close lesson meetings automatically for now
            },
            relations: ['host'],
        });

        for (const meeting of liveMeetings) {
            try {
                // Get lesson to check end time
                const lesson = await this.lessonRepository.findOne({
                    where: { id: meeting.lesson_id }
                });

                if (!lesson) continue;

                // Calculate end time based on lesson duration
                // Assuming lesson.duration_minutes is in minutes
                // If we don't have duration, default to 60 mins
                const durationMinutes = lesson.duration_minutes || 60;

                // Calculate expected end time
                const startTime = meeting.scheduled_at || meeting.created_at;
                const expectedEndTime = new Date(startTime.getTime() + durationMinutes * 60000);

                // Add 10 mins grace period
                const closeThreshold = new Date(expectedEndTime.getTime() + 10 * 60000);

                if (now > closeThreshold) {
                    // Close the meeting
                    meeting.status = MeetingStatus.ENDED;
                    meeting.meeting_state = 'closed';
                    meeting.auto_closed_at = new Date();
                    meeting.ended_at = new Date();

                    await this.meetingRepository.save(meeting);
                    this.logger.log(`Auto-closed meeting ${meeting.id} (${meeting.title})`);

                    // Notify host
                    if (meeting.host) {
                        await this.notificationService.send({
                            userId: meeting.host.id,
                            type: NotificationType.IN_APP,
                            title: 'Class Ended',
                            message: `Your class "${meeting.title}" has ended automatically.`,
                            data: { meetingId: meeting.id },
                        });
                    }
                }

            } catch (error) {
                this.logger.error(`Failed to process auto-close for meeting ${meeting.id}: ${error.message}`);
            }
        }
    }
}
