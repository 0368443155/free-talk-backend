import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Meeting, MeetingStatus, MeetingType, PricingType, MeetingLevel } from './entities/meeting.entity';
import { MeetingParticipant, ParticipantRole } from './entities/meeting-participant.entity';
import { MeetingChatMessage, MessageType } from './entities/meeting-chat-message.entity';
import { MeetingSettings } from './entities/meeting-settings.entity';
import { MeetingTag } from './entities/meeting-tag.entity';
import { BlockedParticipant } from './entities/blocked-participant.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';
import { EnrollmentService } from '../courses/enrollment.service';
import { RefundService } from '../booking/refund.service';
import { CreditsService } from '../credits/credits.service';
import { CreditTransaction, TransactionType, TransactionStatus } from '../credits/entities/credit-transaction.entity';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(MeetingChatMessage)
    private readonly chatMessageRepository: Repository<MeetingChatMessage>,
    @InjectRepository(MeetingSettings)
    private readonly meetingSettingsRepository: Repository<MeetingSettings>,
    @InjectRepository(MeetingTag)
    private readonly meetingTagRepository: Repository<MeetingTag>,
    @InjectRepository(BlockedParticipant)
    private readonly blockedParticipantRepository: Repository<BlockedParticipant>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly enrollmentService: EnrollmentService,
    private readonly refundService: RefundService,
    private readonly creditsService: CreditsService,
  ) { }

  async cancelMeeting(meetingId: string, user: User, reason: string) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the host can cancel the meeting');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new ConflictException('Meeting is already cancelled');
    }

    // Update status
    meeting.status = MeetingStatus.CANCELLED;
    await this.meetingRepository.save(meeting);

    // Refund all bookings
    await this.refundService.refundAllBookings(meetingId, user.id, reason);

    return { message: 'Meeting cancelled and refunds processed' };
  }


  async createPublicMeeting(createMeetingDto: CreateMeetingDto, user: User) {
    // Set defaults based on meeting type
    const meetingType = createMeetingDto.meeting_type || MeetingType.FREE_TALK;

    // Apply meeting type specific defaults
    const meetingDefaults = this.getMeetingTypeDefaults(meetingType);

    // Create meeting without classroom
    const { settings: settingsDto, tags: tagsDto, ...meetingData } = createMeetingDto;
    const meeting = this.meetingRepository.create({
      ...meetingDefaults,
      ...meetingData,
      meeting_type: meetingType,
      host: user,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Create meeting settings
    const settings = this.meetingSettingsRepository.create({
      meeting_id: savedMeeting.id,
      allow_screen_share: settingsDto?.allow_screen_share ?? true,
      allow_chat: settingsDto?.allow_chat ?? true,
      allow_reactions: settingsDto?.allow_reactions ?? true,
      record_meeting: settingsDto?.record_meeting ?? false,
      waiting_room: settingsDto?.waiting_room ?? false,
      auto_record: settingsDto?.auto_record ?? false,
      mute_on_join: settingsDto?.mute_on_join ?? false,
    });
    await this.meetingSettingsRepository.save(settings);

    // Create meeting tags
    if (tagsDto && tagsDto.length > 0) {
      const tags = tagsDto.map(tag =>
        this.meetingTagRepository.create({
          meeting_id: savedMeeting.id,
          tag: tag,
        })
      );
      await this.meetingTagRepository.save(tags);
    }

    // Add host as participant
    const hostParticipant = this.participantRepository.create({
      meeting: savedMeeting,
      user,
      role: ParticipantRole.HOST,
      joined_at: new Date(),
      is_online: false,
    });

    await this.participantRepository.save(hostParticipant);

    return savedMeeting;
  }

  private getMeetingTypeDefaults(meetingType: MeetingType) {
    switch (meetingType) {
      case MeetingType.FREE_TALK:
        return {
          max_participants: 4,
          is_audio_first: true,
          pricing_type: PricingType.FREE,
          price_credits: 0,
          requires_approval: false,
        };
      case MeetingType.TEACHER_CLASS:
        return {
          max_participants: 100,
          is_audio_first: false,
          pricing_type: PricingType.CREDITS,
          price_credits: 1,
          requires_approval: false,
        };
      case MeetingType.WORKSHOP:
        return {
          max_participants: 50,
          is_audio_first: false,
          pricing_type: PricingType.CREDITS,
          price_credits: 5,
          requires_approval: true,
        };
      case MeetingType.PRIVATE_SESSION:
        return {
          max_participants: 2,
          is_audio_first: false,
          pricing_type: PricingType.CREDITS,
          price_credits: 10,
          requires_approval: true,
        };
      default:
        return {
          max_participants: 4,
          is_audio_first: true,
          pricing_type: PricingType.FREE,
          price_credits: 0,
          requires_approval: false,
        };
    }
  }

  // 🔥 FIX: Helper method to sync current_participants with actual online count
  private async syncCurrentParticipants(meetingId: string): Promise<number> {
    const onlineCount = await this.participantRepository.count({
      where: {
        meeting: { id: meetingId },
        is_online: true,
      },
    });

    await this.meetingRepository.update(
      { id: meetingId },
      { current_participants: onlineCount }
    );

    return onlineCount;
  }

  async findAllPublicMeetings(paginationDto: PaginationDto, filters?: {
    meeting_type?: MeetingType;
    language?: string;
    level?: MeetingLevel;
    region?: string;
    status?: MeetingStatus;
    is_live_only?: boolean;
  }) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      is_classroom_only: false,
      is_private: false,
      lesson_id: IsNull(), // Exclude course lesson meetings
    };

    // Apply filters
    if (filters?.meeting_type) {
      whereClause.meeting_type = filters.meeting_type;
    }
    if (filters?.language) {
      whereClause.language = filters.language;
    }
    if (filters?.level) {
      whereClause.level = filters.level;
    }
    if (filters?.region) {
      whereClause.region = filters.region;
    }
    if (filters?.status) {
      whereClause.status = filters.status;
    }
    if (filters?.is_live_only) {
      whereClause.status = MeetingStatus.LIVE;
    }

    try {
      const [meetings, total] = await this.meetingRepository.findAndCount({
        where: whereClause,
        relations: ['host', 'participants', 'participants.user'],
        order: { scheduled_at: 'DESC', created_at: 'DESC' },
        skip,
        take: limit,
      });

      // 🔥 FIX: Sync current_participants for each meeting
      for (const meeting of meetings) {
        const onlineCount = await this.syncCurrentParticipants(meeting.id);
        meeting.current_participants = onlineCount;
      }

      return {
        data: meetings,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch public meetings: ${error.message}`, error.stack);
      // Return empty result instead of throwing to prevent 500 error
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  // Find available free talk rooms (max 4 people, audio-first)
  async findAvailableFreeTalkRooms(paginationDto: PaginationDto, filters?: {
    language?: string;
    level?: MeetingLevel;
    region?: string;
  }) {
    return this.findAllPublicMeetings(paginationDto, {
      meeting_type: MeetingType.FREE_TALK,
      status: MeetingStatus.LIVE,
      ...filters,
    });
  }

  // Find teacher classes (scheduled or live)
  async findTeacherClasses(paginationDto: PaginationDto, filters?: {
    language?: string;
    level?: MeetingLevel;
    min_price?: number;
    max_price?: number;
    scheduled_only?: boolean;
  }) {
    const baseFilters: any = {
      meeting_type: MeetingType.TEACHER_CLASS,
      ...filters,
    };

    if (filters?.scheduled_only) {
      baseFilters.status = MeetingStatus.SCHEDULED;
    }

    const result = await this.findAllPublicMeetings(paginationDto, baseFilters);

    // Apply price filtering client-side if needed
    if (filters?.min_price !== undefined || filters?.max_price !== undefined) {
      result.data = result.data.filter(meeting => {
        if (filters.min_price !== undefined && meeting.price_credits < filters.min_price) {
          return false;
        }
        if (filters.max_price !== undefined && meeting.price_credits > filters.max_price) {
          return false;
        }
        return true;
      });
    }

    return result;
  }

  // Find nearby meetings based on region
  async findNearbyMeetings(region: string, paginationDto: PaginationDto) {
    return this.findAllPublicMeetings(paginationDto, {
      region,
      is_live_only: true,
    });
  }


  async findOne(meetingId: string, user: User) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: [
        'host',
        'participants',
        'participants.user',
        'settings',
        'tags',
        'blocked_users',
      ],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    console.log(`Find meeting ${meetingId}:`, {
      status: meeting.status,
      current_participants: meeting.current_participants,
      total_participants: meeting.total_participants,
      is_locked: meeting.is_locked
    });


    // 🔥 FIX: Sync current_participants before returning
    const onlineCount = await this.syncCurrentParticipants(meetingId);
    meeting.current_participants = onlineCount;

    return meeting;
  }

  async update(meetingId: string, updateMeetingDto: UpdateMeetingDto, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the host can update this meeting');
    }

    Object.assign(meeting, updateMeetingDto);
    return this.meetingRepository.save(meeting);
  }

  async remove(meetingId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the host can delete this meeting');
    }

    await this.meetingRepository.remove(meeting);
    return { message: 'Meeting deleted successfully' };
  }

  async startMeeting(meetingId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id) {
      throw new ForbiddenException('Only the host can start the meeting');
    }

    if (meeting.status === MeetingStatus.LIVE) {
      throw new ConflictException('Meeting is already live');
    }

    meeting.status = MeetingStatus.LIVE;
    meeting.started_at = new Date();

    return this.meetingRepository.save(meeting);
  }

  async endMeeting(meetingId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id) {
      throw new ForbiddenException('Only the host can end the meeting');
    }

    if (meeting.status !== MeetingStatus.LIVE) {
      throw new BadRequestException('Meeting is not live');
    }

    meeting.status = MeetingStatus.ENDED;
    meeting.ended_at = new Date();

    // Mark all participants as offline
    await this.participantRepository.update(
      { meeting: { id: meetingId }, is_online: true },
      { is_online: false, left_at: new Date() },
    );

    const savedMeeting = await this.meetingRepository.save(meeting);

    // 🔥 HOTFIX: Trigger real-time payment processing for paid meetings
    // This ensures teachers receive payment immediately instead of waiting for sweeper job
    if (meeting.pricing_type === 'credits' && meeting.price_credits > 0) {
      try {
        // Reload meeting with host relation for payment processing
        const meetingWithHost = await this.meetingRepository.findOne({
          where: { id: meetingId },
          relations: ['host'],
        });

        // Only process if payment hasn't been processed yet
        if (meetingWithHost && (!meetingWithHost.payment_status || meetingWithHost.payment_status === 'pending')) {
          this.logger.log(`Triggering real-time payment processing for meeting ${meetingId}`);
          
          // Get all participants who actually joined (have left_at or duration > 0, excluding host)
          const participants = await this.participantRepository
            .createQueryBuilder('participant')
            .leftJoinAndSelect('participant.user', 'user')
            .where('participant.meeting_id = :meetingId', { meetingId })
            .andWhere('participant.user_id != :hostId', { hostId: meetingWithHost.host.id })
            .andWhere('(participant.left_at IS NOT NULL OR participant.duration_seconds > 0)')
            .getMany();

          if (participants.length > 0) {
            // Process payment for each participant
            let successCount = 0;
            let failureCount = 0;

            for (const participant of participants) {
              try {
                // Check if payment already processed by checking for existing transaction
                const existingTransaction = await this.dataSource
                  .getRepository(CreditTransaction)
                  .findOne({
                    where: {
                      meeting_id: meetingId,
                      user_id: participant.user_id,
                      transaction_type: TransactionType.DEDUCTION,
                      status: TransactionStatus.COMPLETED,
                    },
                  });

                if (!existingTransaction) {
                  await this.creditsService.processClassPayment(meetingWithHost, participant.user);
                  this.logger.log(`Payment processed for participant ${participant.user_id} in meeting ${meetingId}`);
                  successCount++;
                } else {
                  this.logger.log(`Payment already processed for participant ${participant.user_id}, skipping`);
                  successCount++; // Count as success since already processed
                }
              } catch (error) {
                this.logger.error(`Failed to process payment for participant ${participant.user_id}: ${error.message}`);
                failureCount++;
                // Continue processing other participants even if one fails
              }
            }

            // Update payment status based on results
            const paymentStatus = failureCount === 0 ? 'completed' : successCount > 0 ? 'partial' : 'failed';
            await this.meetingRepository.update(meetingId, {
              payment_status: paymentStatus as any,
              payment_processed_at: new Date(),
            });

            this.logger.log(`Real-time payment processing completed for meeting ${meetingId}: ${successCount} success, ${failureCount} failures`);
          } else {
            // No participants, mark as completed with no payments
            await this.meetingRepository.update(meetingId, {
              payment_status: 'completed' as any,
              payment_processed_at: new Date(),
            });
            this.logger.log(`No participants found for meeting ${meetingId}, marked as completed`);
          }
        }
      } catch (error) {
        // Log error but don't fail the meeting end operation
        // Payment will be processed by sweeper job if real-time processing fails
        this.logger.error(`Real-time payment processing failed for meeting ${meetingId}: ${error.message}`);
      }
    }

    return savedMeeting;
  }

  async joinMeeting(meetingId: string, user: User, deviceSettings?: { audioEnabled?: boolean; videoEnabled?: boolean }) {
    const meeting = await this.findOne(meetingId, user);

    // Auto-start meeting if host joins a scheduled meeting
    const isHost = meeting.host.id === user.id;
    if (meeting.status === MeetingStatus.SCHEDULED && isHost) {
      meeting.status = MeetingStatus.LIVE;
      meeting.started_at = new Date();
      await this.meetingRepository.save(meeting);
      console.log(`Meeting ${meetingId} auto-started by host ${user.username}`);
    }

    if (meeting.status !== MeetingStatus.LIVE) {
      throw new BadRequestException('Meeting is not live');
    }

    // Check if user is blocked from this meeting
    const isBlocked = await this.blockedParticipantRepository.findOne({
      where: { meeting_id: meetingId, user_id: user.id },
    });

    if (isBlocked) {
      throw new ForbiddenException('You have been blocked from this meeting');
    }

    // Check if meeting is locked
    if (meeting.is_locked && meeting.host.id !== user.id) {
      throw new ForbiddenException('Meeting is locked');
    }

    // 🔥 FIX: Count actual online participants from database instead of using counter
    const onlineParticipantsCount = await this.participantRepository.count({
      where: {
        meeting: { id: meetingId },
        is_online: true,
      },
    });

    console.log(`Join meeting - Current online participants: ${onlineParticipantsCount}/${meeting.max_participants}`);

    // Check if already a participant
    let participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: meetingId },
        user: { id: user.id },
      },
      relations: ['user'],
    });

    console.log(`Join meeting - User: ${user?.username}, Existing participant:`, participant ? {
      id: participant.id,
      is_online: participant.is_online,
      is_kicked: participant.is_kicked
    } : 'null');

    let isNewParticipant = false;

    if (participant) {
      // Rejoin
      if (participant.is_kicked) {
        throw new ForbiddenException('You have been kicked from this meeting');
      }

      // 🔥 FIX: Check capacity before allowing rejoin if user was offline
      if (!participant.is_online) {
        // Check if room is full (excluding current user who is offline)
        if (onlineParticipantsCount >= meeting.max_participants) {
          throw new ConflictException('Meeting is full');
        }
        meeting.current_participants += 1;
      }

      participant.is_online = true;
      participant.left_at = undefined as any;
    } else {
      // New participant - check capacity
      if (onlineParticipantsCount >= meeting.max_participants) {
        throw new ConflictException('Meeting is full');
      }

      participant = this.participantRepository.create({
        meeting,
        user,
        role: ParticipantRole.PARTICIPANT,
        joined_at: new Date(),
        is_online: true,
        // Use deviceSettings if provided, otherwise use meeting default
        is_muted: deviceSettings
          ? !deviceSettings.audioEnabled
          : (meeting.settings?.mute_on_join || false),
        is_video_off: deviceSettings
          ? !deviceSettings.videoEnabled
          : false,
      });

      if (deviceSettings) {
        console.log('🔄 Created participant with deviceSettings:', {
          is_muted: participant.is_muted,
          is_video_off: participant.is_video_off,
          audioEnabled: deviceSettings.audioEnabled,
          videoEnabled: deviceSettings.videoEnabled
        });
      }

      meeting.total_participants += 1;
      meeting.current_participants += 1;
      isNewParticipant = true;
    }

    await this.meetingRepository.save(meeting);
    await this.participantRepository.save(participant);

    console.log(`Join meeting success - Participant saved:`, {
      id: participant.id,
      user: participant.user?.username,
      is_online: participant.is_online,
      current_participants: meeting.current_participants,
      online_count: onlineParticipantsCount + (isNewParticipant || !participant.is_online ? 1 : 0)
    });

    // Create system message
    await this.createSystemMessage(meeting, `${user.username} joined the meeting`);

    return participant;
  }

  /**
   * Validate lesson meeting access and time - does NOT create participant
   * Participant will be created when user actually joins via frontend
   */
  async joinLessonMeeting(userId: string, lessonId: string) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['meeting', 'session', 'session.course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (!lesson.meeting) {
      throw new NotFoundException('Meeting not found for this lesson');
    }

    // Get user from userId
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check access using EnrollmentService
    const access = await this.enrollmentService.hasAccessToLesson(userId, lessonId);
    if (!access.hasAccess) {
      throw new ForbiddenException(
        access.reason || 'You need to purchase this course to access this lesson',
      );
    }

    // Check time validation
    if (!lesson.can_join) {
      if (lesson.is_past) {
        throw new BadRequestException('This lesson has ended');
      }
      if (lesson.is_upcoming) {
        const minutesUntilStart = Math.floor(
          (lesson.scheduled_datetime.getTime() - Date.now()) / (60 * 1000)
        );
        throw new BadRequestException(
          `This lesson starts in ${minutesUntilStart} minutes. You can join 15 minutes before the scheduled time.`,
        );
      }
    }

    // Auto-start meeting if it's time and meeting is scheduled
    if (lesson.meeting.status === MeetingStatus.SCHEDULED) {
      if (lesson.is_ongoing || lesson.can_join) {
        await this.meetingRepository.update(lesson.meeting.id, {
          status: MeetingStatus.LIVE,
          started_at: new Date(),
        });
        this.logger.log(`Auto-started meeting for lesson: ${lessonId}`);
      }
    }

    // Return meeting info without creating participant
    // Frontend will handle actual join after user selects meeting type
    return {
      meeting: lesson.meeting,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        scheduled_date: lesson.scheduled_date,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
      },
      access: {
        hasAccess: true,
        reason: access.reason,
      },
    };
  }

  async leaveMeeting(meetingId: string, user: User) {
    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: meetingId },
        user: { id: user.id },
        is_online: true,
      },
      relations: ['meeting', 'user'],
    });

    if (!participant) {
      throw new NotFoundException('You are not in this meeting');
    }

    participant.is_online = false;
    participant.left_at = new Date();
    await this.participantRepository.save(participant);

    // Update meeting
    const meeting = participant.meeting;
    meeting.current_participants = Math.max(0, meeting.current_participants - 1);
    await this.meetingRepository.save(meeting);

    // Create system message
    await this.createSystemMessage(meeting, `${user.username} left the meeting`);

    return { message: 'Left meeting successfully' };
  }

  async lockMeeting(meetingId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id) {
      throw new ForbiddenException('Only the host can lock the meeting');
    }

    if (meeting.is_locked) {
      throw new ConflictException('Meeting is already locked');
    }

    meeting.is_locked = true;
    await this.meetingRepository.save(meeting);

    // Create system message
    await this.createSystemMessage(meeting, 'Meeting has been locked');

    return meeting;
  }

  async unlockMeeting(meetingId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id) {
      throw new ForbiddenException('Only the host can unlock the meeting');
    }

    if (!meeting.is_locked) {
      throw new ConflictException('Meeting is not locked');
    }

    meeting.is_locked = false;
    await this.meetingRepository.save(meeting);

    // Create system message
    await this.createSystemMessage(meeting, 'Meeting has been unlocked');

    return meeting;
  }

  async getParticipants(meetingId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    const participants = await this.participantRepository.find({
      where: { meeting: { id: meetingId } },
      relations: ['user'],
      order: { joined_at: 'ASC' },
    });

    console.log(`Get participants for meeting ${meetingId}:`, participants.map(p => ({
      user: p.user.username,
      is_online: p.is_online,
      joined_at: p.joined_at
    })));

    return participants.map((p) => ({
      id: p.id,
      user: {
        id: p.user.id,
        name: p.user.username,
        email: p.user.email,
        avatar_url: p.user.avatar_url,
      },
      role: p.role,
      is_online: p.is_online,
      is_muted: p.is_muted,
      is_video_off: p.is_video_off,
      is_hand_raised: p.is_hand_raised,
      is_kicked: p.is_kicked,
      joined_at: p.joined_at,
      left_at: p.left_at,
    }));
  }

  async getChatMessages(meetingId: string, user: User, paginationDto: PaginationDto) {
    const meeting = await this.findOne(meetingId, user);
    const { page = 1, limit = 50 } = paginationDto;
    const skip = (page - 1) * limit;

    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { meeting: { id: meetingId } },
      relations: ['sender'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: messages.map((m) => ({
        id: m.id,
        message: m.message,
        type: m.type,
        sender: m.sender
          ? {
            id: m.sender.id,
            name: m.sender.username,
            avatar_url: m.sender.avatar_url,
          }
          : null,
        metadata: m.metadata,
        created_at: m.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async kickParticipant(meetingId: string, participantId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the host can kick participants');
    }

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, meeting: { id: meetingId } },
      relations: ['user'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.role === ParticipantRole.HOST) {
      throw new ForbiddenException('Cannot kick the host');
    }

    participant.is_kicked = true;
    participant.is_online = false;
    participant.left_at = new Date();
    await this.participantRepository.save(participant);

    // Update meeting participant count
    meeting.current_participants = Math.max(0, meeting.current_participants - 1);
    await this.meetingRepository.save(meeting);

    // Create system message
    await this.createSystemMessage(meeting, `${participant.user.username} was kicked from the meeting`);

    return { message: 'Participant kicked successfully' };
  }

  async blockParticipant(meetingId: string, participantId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the host can block participants');
    }

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, meeting: { id: meetingId } },
      relations: ['user'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.role === ParticipantRole.HOST) {
      throw new ForbiddenException('Cannot block the host');
    }

    // Add user to blocked list
    const existingBlock = await this.blockedParticipantRepository.findOne({
      where: { meeting_id: meeting.id, user_id: participant.user.id },
    });
    if (!existingBlock) {
      const blockedParticipant = this.blockedParticipantRepository.create({
        meeting_id: meeting.id,
        user_id: participant.user.id,
        blocked_by: user.id,
        reason: 'Blocked by host',
      });
      await this.blockedParticipantRepository.save(blockedParticipant);
    }

    // Kick participant if online
    if (participant.is_online) {
      participant.is_kicked = true;
      participant.is_online = false;
      participant.left_at = new Date();
      await this.participantRepository.save(participant);

      meeting.current_participants = Math.max(0, meeting.current_participants - 1);
    }

    await this.meetingRepository.save(meeting);

    // Create system message
    await this.createSystemMessage(meeting, `${participant.user.username} was blocked from the meeting`);

    return { message: 'Participant blocked successfully' };
  }

  async muteParticipant(meetingId: string, participantId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    // Check if user is host or moderator
    const requesterParticipant = await this.participantRepository.findOne({
      where: { meeting: { id: meetingId }, user: { id: user.id } },
    });

    if (
      !requesterParticipant ||
      (requesterParticipant.role !== ParticipantRole.HOST &&
        requesterParticipant.role !== ParticipantRole.MODERATOR)
    ) {
      throw new ForbiddenException('Only host or moderators can mute participants');
    }

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, meeting: { id: meetingId } },
      relations: ['user'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.is_muted = true;
    await this.participantRepository.save(participant);

    return participant;
  }

  async promoteParticipant(meetingId: string, participantId: string, user: User) {
    const meeting = await this.findOne(meetingId, user);

    if (meeting.host.id !== user.id) {
      throw new ForbiddenException('Only the host can promote participants');
    }

    const participant = await this.participantRepository.findOne({
      where: { id: participantId, meeting: { id: meetingId } },
      relations: ['user'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.role === ParticipantRole.HOST) {
      throw new BadRequestException('Participant is already the host');
    }

    participant.role = ParticipantRole.MODERATOR;
    await this.participantRepository.save(participant);

    // Create system message
    await this.createSystemMessage(meeting, `${participant.user.username} was promoted to moderator`);

    return participant;
  }

  private async createSystemMessage(meeting: Meeting, message: string) {
    const systemMessage = this.chatMessageRepository.create({
      meeting,
      sender: undefined as any,
      message,
      type: MessageType.SYSTEM,
    });
    await this.chatMessageRepository.save(systemMessage);
  }
}

