import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Meeting, MeetingStatus, PaymentStatus } from '../meeting/entities/meeting.entity';
import { CreditsService } from '../credits/credits.service';
import { MeetingParticipant } from '../meeting/entities/meeting-participant.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class RevenueSweeperJob {
  private readonly logger = new Logger(RevenueSweeperJob.name);

  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private participantRepository: Repository<MeetingParticipant>,
    private creditsService: CreditsService,
  ) {}

  /**
   * Sweep unprocessed meetings every 30 minutes
   * Finds meetings that ended > 30 mins ago but payment_status is still PENDING
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sweepUnprocessedMeetings() {
    this.logger.log('Starting revenue sweeper job...');

    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find meetings that ended > 30 mins ago but payment_status is PENDING or null
      const meetings = await this.meetingRepository.find({
        where: {
          status: MeetingStatus.ENDED,
          ended_at: LessThan(thirtyMinutesAgo),
          price_credits: MoreThan(0), // Only paid meetings
        },
        relations: ['host'],
        take: 10, // Process batch of 10 at a time
        order: {
          ended_at: 'ASC', // Process oldest first
        },
      });

      // Filter meetings with PENDING or null payment_status
      const unprocessedMeetings = meetings.filter(
        (m) => !m.payment_status || m.payment_status === PaymentStatus.PENDING,
      );

      if (unprocessedMeetings.length === 0) {
        this.logger.log('No unprocessed meetings found.');
        return;
      }

      this.logger.log(`Found ${unprocessedMeetings.length} unprocessed meeting(s)`);

      for (const meeting of unprocessedMeetings) {
        try {
          await this.processMeetingRevenue(meeting);
        } catch (error) {
          this.logger.error(
            `Failed to process revenue for meeting ${meeting.id}: ${error.message}`,
            error.stack,
          );
          // Continue with next meeting
        }
      }

      this.logger.log(`Revenue sweeper job completed. Processed ${unprocessedMeetings.length} meeting(s)`);
    } catch (error) {
      this.logger.error(`Revenue sweeper job failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Process revenue for a single meeting
   * This ensures all participants who actually joined are processed
   */
  private async processMeetingRevenue(meeting: Meeting) {
    this.logger.log(`Processing revenue for meeting ${meeting.id}...`);

    // Get all participants who actually joined (have duration > 0 or left_at is set)
    const participants = await this.participantRepository
      .createQueryBuilder('participant')
      .where('participant.meeting_id = :meetingId', { meetingId: meeting.id })
      .andWhere('participant.user_id != :hostId', { hostId: meeting.host?.id || '' })
      .andWhere('(participant.duration_seconds > 0 OR participant.left_at IS NOT NULL)')
      .leftJoinAndSelect('participant.user', 'user')
      .getMany();

    if (participants.length === 0) {
      this.logger.warn(`No participants found for meeting ${meeting.id}`);
      // Mark as completed even if no participants
      const meetingToUpdate = await this.meetingRepository.findOne({ where: { id: meeting.id } });
      if (meetingToUpdate) {
        meetingToUpdate.payment_status = PaymentStatus.COMPLETED;
        meetingToUpdate.payment_processed_at = new Date();
        meetingToUpdate.payment_metadata = { reason: 'No participants' };
        await this.meetingRepository.save(meetingToUpdate);
      }
      return;
    }

    // Update meeting status to PROCESSING
    await this.meetingRepository.update(meeting.id, {
      payment_status: PaymentStatus.PROCESSING,
    });

    interface PaymentResult {
      user_id: string;
      status: 'success' | 'failed';
      error?: string;
    }
    const results: PaymentResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each participant
    for (const participant of participants) {
      // Skip host
      if (participant.user_id === meeting.host?.id) {
        continue;
      }

      try {
        // Check if payment already processed (by checking transactions)
        // For now, we'll process anyway to ensure consistency
        // You can add a check here to skip if already processed

        // Process payment
        await this.creditsService.processClassPayment(meeting, participant.user);
        results.push({
          user_id: participant.user_id,
          status: 'success',
        });
        successCount++;
      } catch (error) {
        this.logger.error(
          `Payment processing failed for user ${participant.user_id} in meeting ${meeting.id}: ${error.message}`,
        );
        results.push({
          user_id: participant.user_id,
          status: 'failed',
          error: error.message,
        });
        failureCount++;
      }
    }

    // Update meeting payment status
    const finalStatus =
      failureCount === 0
        ? PaymentStatus.COMPLETED
        : successCount > 0
          ? PaymentStatus.PARTIAL
          : PaymentStatus.FAILED;

    const meetingToUpdate = await this.meetingRepository.findOne({ where: { id: meeting.id } });
    if (meetingToUpdate) {
      meetingToUpdate.payment_status = finalStatus;
      meetingToUpdate.payment_processed_at = new Date();
      meetingToUpdate.payment_metadata = {
        results,
        success_count: successCount,
        failure_count: failureCount,
        processed_at: new Date().toISOString(),
      };
      await this.meetingRepository.save(meetingToUpdate);
    }

    this.logger.log(
      `Meeting ${meeting.id} revenue processing completed: ${successCount} success, ${failureCount} failures`,
    );
  }
}

