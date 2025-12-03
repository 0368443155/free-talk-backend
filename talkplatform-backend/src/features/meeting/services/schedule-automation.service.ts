import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Not, In } from 'typeorm';
import { Meeting, MeetingStatus, MeetingType } from '../entities/meeting.entity';
import { Lesson } from '../../courses/entities/lesson.entity';

@Injectable()
export class ScheduleAutomationService {
    private readonly logger = new Logger(ScheduleAutomationService.name);

    constructor(
        @InjectRepository(Meeting)
        private readonly meetingRepository: Repository<Meeting>,
        @InjectRepository(Lesson)
        private readonly lessonRepository: Repository<Lesson>,
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

                // If it's a lesson meeting, we might want to check lesson details too
                // But for now, rely on meeting.scheduled_at

                await this.meetingRepository.save(meeting);
                this.logger.log(`Auto-opened meeting ${meeting.id} (${meeting.title})`);

                // TODO: Send notification to host and participants
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
        // This is tricky because we need to know the duration
        // For Phase 1, we focus on Lesson meetings which have defined end times

        const liveMeetings = await this.meetingRepository.find({
            where: {
                status: MeetingStatus.LIVE,
                meeting_state: In(['open', 'in_progress']),
                lesson_id: Not(IsNull()), // Only close lesson meetings automatically for now
            },
        });

        for (const meeting of liveMeetings) {
            try {
                // Get lesson to check end time
                const lesson = await this.lessonRepository.findOne({
                    where: { id: meeting.lesson_id }
                });

                if (!lesson) continue;

                // Calculate end datetime
                // lesson.scheduled_date + lesson.end_time
                // This requires parsing date/time strings or using a helper
                // Assuming lesson has a proper datetime field or we construct it

                // Simplified logic: If meeting has ended_at set (manual end) or past duration
                // For now, let's assume we use meeting.scheduled_at + duration (if we had it)

                // If we don't have duration, we can't auto-close safely without more info
                // So we'll skip for now unless we find a clear rule

                // Alternative: Close if empty for X minutes?
                // That's a different logic (idle timeout)

            } catch (error) {
                this.logger.error(`Failed to process auto-close for meeting ${meeting.id}: ${error.message}`);
            }
        }
    }
}
