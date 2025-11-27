import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessToken } from 'livekit-server-sdk';
import { Meeting, MeetingType, MeetingStatus, PricingType } from '../meeting/entities/meeting.entity';
import { MeetingParticipant, ParticipantRole } from '../meeting/entities/meeting-participant.entity';
import { MeetingSettings } from '../meeting/entities/meeting-settings.entity';
import { MeetingTag } from '../meeting/entities/meeting-tag.entity';
import { BlockedParticipant } from '../meeting/entities/blocked-participant.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateLiveKitRoomDto, JoinLiveKitRoomDto } from './dto/livekit-room.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';
import { LiveKitService } from '../../livekit/livekit.service';
import { IsNull } from 'typeorm';

@Injectable()
export class LiveKitRoomsService {
  private readonly logger = new Logger(LiveKitRoomsService.name);

  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private participantRepository: Repository<MeetingParticipant>,
    @InjectRepository(MeetingSettings)
    private meetingSettingsRepository: Repository<MeetingSettings>,
    @InjectRepository(MeetingTag)
    private meetingTagRepository: Repository<MeetingTag>,
    @InjectRepository(BlockedParticipant)
    private blockedParticipantRepository: Repository<BlockedParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private liveKitService: LiveKitService
  ) {}

  // Free Talk Room Creation (Max 4 people, Audio-first)
  async createFreeTalkRoom(dto: CreateLiveKitRoomDto, user: User) {
    this.logger.log(`Creating free talk room: ${dto.title} by user ${user.id}`);

    const meeting = this.meetingRepository.create({
      title: dto.title,
      description: dto.description,
      host: user,
      meeting_type: MeetingType.FREE_TALK,
      max_participants: Math.min(dto.max_participants || 4, 4), // Max 4 for free talk
      is_audio_first: dto.is_audio_first !== false, // Default true
      language: dto.language || 'English',
      level: dto.level,
      topic: dto.topic,
      region: dto.region,
      pricing_type: PricingType.FREE,
      price_credits: 0,
      is_private: dto.is_private || false,
      requires_approval: dto.requires_approval || false,
      status: MeetingStatus.LIVE, // Free talk starts immediately
      started_at: new Date(),
      current_participants: 0,
      total_participants: 0
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Create meeting settings
    const settings = this.meetingSettingsRepository.create({
      meeting_id: savedMeeting.id,
      allow_screen_share: dto.allow_screen_share !== false,
      allow_chat: dto.allow_chat !== false,
      allow_reactions: true,
      record_meeting: dto.record_session || false,
      waiting_room: false,
      auto_record: false,
      mute_on_join: false,
    });
    await this.meetingSettingsRepository.save(settings);

    // Create meeting tags
    if (dto.tags && dto.tags.length > 0) {
      const tags = dto.tags.map(tag =>
        this.meetingTagRepository.create({
          meeting_id: savedMeeting.id,
          tag: tag,
        })
      );
      await this.meetingTagRepository.save(tags);
    }

    // Create LiveKit room (placeholder - implement in LiveKitService)
    // await this.liveKitService.createRoom(savedMeeting.id);

    // Add host as participant
    const hostParticipant = this.participantRepository.create({
      meeting: savedMeeting,
      user,
      role: ParticipantRole.HOST,
      joined_at: new Date(),
      is_online: false // Will be set when actually joining
    });

    await this.participantRepository.save(hostParticipant);

    this.logger.log(`Free talk room created: ${savedMeeting.id}`);

    return {
      room: savedMeeting,
      livekit_room_name: savedMeeting.id,
      join_url: `/livekit/rooms/${savedMeeting.id}`
    };
  }

  // Teacher Class Creation (Unlimited participants, Scheduled)
  async createTeacherClass(dto: CreateLiveKitRoomDto, user: User) {
    this.logger.log(`Creating teacher class: ${dto.title} by user ${user.id}`);

    // Validate teacher permissions
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only teachers can create classes');
    }

    // TODO: Fix TypeORM entity creation issue
    const meetingData: any = {
      title: dto.title,
      description: dto.description,
      host: user,
      meeting_type: MeetingType.TEACHER_CLASS,
      max_participants: dto.max_participants || 100,
      is_audio_first: dto.is_audio_first || false, // Teachers usually use video
      language: dto.language || 'English',
      level: dto.level,
      topic: dto.topic,
      region: dto.region,
      pricing_type: dto.pricing_type || PricingType.CREDITS,
      price_credits: dto.price_credits || 1,
      affiliate_code: dto.affiliate_code || user.affiliate_code,
      is_private: dto.is_private || false,
      requires_approval: dto.requires_approval || false,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      status: dto.scheduled_at ? MeetingStatus.SCHEDULED : MeetingStatus.LIVE,
      started_at: dto.scheduled_at ? null : new Date(),
      current_participants: 0,
      total_participants: 0
    };

    const meeting = this.meetingRepository.create(meetingData);
    const savedMeeting = await this.meetingRepository.save(meeting) as unknown as Meeting;

    // Create meeting settings
    const settings = this.meetingSettingsRepository.create({
      meeting_id: savedMeeting.id,
      allow_screen_share: dto.allow_screen_share !== false,
      allow_chat: dto.allow_chat !== false,
      allow_reactions: true,
      record_meeting: dto.record_session || false,
      waiting_room: dto.requires_approval || false,
      auto_record: false,
      mute_on_join: true, // Students join muted
    });
    await this.meetingSettingsRepository.save(settings);

    // Create meeting tags
    if (dto.tags && dto.tags.length > 0) {
      const tags = dto.tags.map(tag =>
        this.meetingTagRepository.create({
          meeting_id: savedMeeting.id,
          tag: tag,
        })
      );
      await this.meetingTagRepository.save(tags);
    }

    // Create LiveKit room (placeholder - implement in LiveKitService)
    // await this.liveKitService.createRoom(savedMeeting.id);

    // Add teacher as host participant
    const hostParticipant = this.participantRepository.create({
      meeting: savedMeeting,
      user,
      role: ParticipantRole.HOST,
      joined_at: new Date(),
      is_online: false
    });

    await this.participantRepository.save(hostParticipant);

    this.logger.log(`Teacher class created: ${savedMeeting.id}`);

    return {
      room: savedMeeting,
      livekit_room_name: savedMeeting.id,
      join_url: `/livekit/rooms/${savedMeeting.id}`,
      schedule_info: dto.scheduled_at ? {
        scheduled_at: dto.scheduled_at,
        status: 'scheduled'
      } : {
        status: 'live_now'
      }
    };
  }

  // Discover Free Talk Rooms
  async discoverFreeTalkRooms(paginationDto: PaginationDto, filters: any) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.meetingRepository.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.host', 'host')
      .leftJoinAndSelect('meeting.participants', 'participants')
      .where('meeting.meeting_type = :type', { type: MeetingType.FREE_TALK })
      .andWhere('meeting.status = :status', { status: MeetingStatus.LIVE })
      .andWhere('meeting.is_private = :isPrivate', { isPrivate: false })
      .andWhere('meeting.is_classroom_only = :isClassroomOnly', { isClassroomOnly: false })
      .andWhere('meeting.lesson_id IS NULL') // Exclude course lesson meetings
      .andWhere('meeting.current_participants < meeting.max_participants') // Only rooms with space
      .orderBy('meeting.created_at', 'DESC');

    // Apply filters
    if (filters.language) {
      queryBuilder.andWhere('meeting.language = :language', { language: filters.language });
    }
    if (filters.level) {
      queryBuilder.andWhere('meeting.level = :level', { level: filters.level });
    }
    if (filters.region) {
      queryBuilder.andWhere('meeting.region = :region', { region: filters.region });
    }
    if (filters.topic) {
      queryBuilder.andWhere('meeting.topic LIKE :topic', { topic: `%${filters.topic}%` });
    }

    const [rooms, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: rooms.map(room => ({
        ...room,
        available_slots: room.max_participants - room.current_participants,
        is_full: room.current_participants >= room.max_participants,
        join_url: `/livekit/rooms/${room.id}`
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Discover Teacher Classes
  async discoverTeacherClasses(paginationDto: PaginationDto, filters: any) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.meetingRepository.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.host', 'host')
      .where('meeting.meeting_type = :type', { type: MeetingType.TEACHER_CLASS })
      .andWhere('meeting.is_private = :isPrivate', { isPrivate: false })
      .andWhere('meeting.is_classroom_only = :isClassroomOnly', { isClassroomOnly: false })
      .andWhere('meeting.lesson_id IS NULL'); // Exclude course lesson meetings

    if (filters.scheduled_only) {
      queryBuilder.andWhere('meeting.status = :status', { status: MeetingStatus.SCHEDULED });
    } else {
      queryBuilder.andWhere('meeting.status IN (:...statuses)', { 
        statuses: [MeetingStatus.LIVE, MeetingStatus.SCHEDULED] 
      });
    }

    // Apply filters
    if (filters.language) {
      queryBuilder.andWhere('meeting.language = :language', { language: filters.language });
    }
    if (filters.level) {
      queryBuilder.andWhere('meeting.level = :level', { level: filters.level });
    }
    if (filters.teacher_id) {
      queryBuilder.andWhere('host.id = :teacherId', { teacherId: filters.teacher_id });
    }
    if (filters.min_price !== undefined) {
      queryBuilder.andWhere('meeting.price_credits >= :minPrice', { minPrice: filters.min_price });
    }
    if (filters.max_price !== undefined) {
      queryBuilder.andWhere('meeting.price_credits <= :maxPrice', { maxPrice: filters.max_price });
    }

    queryBuilder.orderBy('meeting.scheduled_at IS NULL', 'ASC') // Live classes first
      .addOrderBy('meeting.scheduled_at', 'ASC')
      .addOrderBy('meeting.created_at', 'DESC');

    const [classes, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: classes.map(cls => ({
        ...cls,
        teacher: {
          id: cls.host.id,
          username: cls.host.username,
          avatar_url: cls.host.avatar_url,
          // TODO: Add teacher ratings and stats
        },
        enrollment_info: {
          available_slots: cls.max_participants - cls.current_participants,
          is_full: cls.current_participants >= cls.max_participants,
          requires_payment: cls.pricing_type !== PricingType.FREE
        },
        join_url: `/livekit/rooms/${cls.id}`
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Find Nearby Rooms
  async findNearbyRooms(region: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [rooms, total] = await this.meetingRepository.findAndCount({
      where: {
        region,
        status: MeetingStatus.LIVE,
        is_private: false,
        is_classroom_only: false,
        lesson_id: IsNull(), // Exclude course lesson meetings
      },
      relations: ['host', 'participants'],
      order: { created_at: 'DESC' },
      skip,
      take: limit
    });

    return {
      data: rooms.map(room => ({
        ...room,
        distance: 'nearby', // TODO: Implement actual distance calculation
        join_url: `/livekit/rooms/${room.id}`
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Join Room with Payment Validation
  async joinRoom(roomId: string, dto: JoinLiveKitRoomDto, user: User) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host', 'participants', 'participants.user']
    });

    if (!meeting) {
      throw new NotFoundException('Room not found');
    }

    // Check if room is full
    if (meeting.current_participants >= meeting.max_participants) {
      throw new BadRequestException('Room is full');
    }

    // Check if user is blocked
    // Check if user is blocked
    const isBlocked = await this.blockedParticipantRepository.findOne({
      where: { meeting_id: meeting.id, user_id: user.id },
    });
    if (isBlocked) {
      throw new ForbiddenException('You are blocked from this room');
    }

    // Validate payment for paid rooms
    if (meeting.pricing_type === PricingType.CREDITS && meeting.price_credits > 0) {
      await this.validateAndDeductCredits(meeting, user);
    }

    // Check if user already in room
    let participant = await this.participantRepository.findOne({
      where: { meeting: { id: roomId }, user: { id: user.id } }
    });

    if (!participant) {
      // Create new participant
      participant = this.participantRepository.create({
        meeting,
        user,
        role: ParticipantRole.PARTICIPANT,
        joined_at: new Date(),
        is_online: true
      });
      await this.participantRepository.save(participant);

      // Update participant count
      meeting.current_participants += 1;
      meeting.total_participants += 1;
      await this.meetingRepository.save(meeting);
    } else {
      // Update existing participant
      participant.is_online = true;
      // participant.last_seen_at = new Date(); // TODO: Add field to entity
      await this.participantRepository.save(participant);
    }

    // Generate LiveKit token
    const token = await this.generateRoomToken(roomId, user);

    this.logger.log(`User ${user.id} joined room ${roomId}`);

    return {
      success: true,
      room: meeting,
      token: token.token,
      participant_info: {
        role: participant.role,
        display_name: dto.display_name || user.username,
        audio_only: dto.audio_only || meeting.is_audio_first,
        join_muted: dto.join_muted,
        video_off: dto.video_off || meeting.is_audio_first
      }
    };
  }

  // Generate LiveKit Access Token
  async generateRoomToken(roomId: string, user: User) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host']
    });

    if (!meeting) {
      throw new NotFoundException('Room not found');
    }

    // Determine participant identity and permissions
    const identity = user.id;
    const name = user.username;
    const isHost = meeting.host.id === user.id;

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity, name }
    );

    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Host permissions
      roomAdmin: isHost,
      roomCreate: isHost,
      canUpdateOwnMetadata: true
    });

    return {
      token: at.toJwt(),
      room_name: roomId,
      participant_identity: identity,
      participant_name: name,
      is_host: isHost
    };
  }

  // Validate Payment and Deduct Credits
  private async validateAndDeductCredits(meeting: Meeting, user: User) {
    if (user.credit_balance < meeting.price_credits) {
      throw new BadRequestException('Insufficient credits');
    }

    // Deduct credits
    user.credit_balance -= meeting.price_credits;
    await this.userRepository.save(user);

    // TODO: Record transaction and handle revenue sharing
    this.logger.log(`Deducted ${meeting.price_credits} credits from user ${user.id} for room ${meeting.id}`);
  }

  // Leave Room
  async leaveRoom(roomId: string, user: User) {
    const participant = await this.participantRepository.findOne({
      where: { meeting: { id: roomId }, user: { id: user.id } }
    });

    if (participant) {
      participant.is_online = false;
      participant.left_at = new Date();
      await this.participantRepository.save(participant);

      // Update participant count
      const meeting = await this.meetingRepository.findOne({ where: { id: roomId } });
      if (meeting && meeting.current_participants > 0) {
        meeting.current_participants -= 1;
        await this.meetingRepository.save(meeting);
      }
    }

    return { success: true };
  }

  // Get Room Details
  async getRoomDetails(roomId: string, user: User) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host', 'participants', 'participants.user']
    });

    if (!meeting) {
      throw new NotFoundException('Room not found');
    }

    const participant = meeting.participants.find(p => p.user.id === user.id);
    const canJoin = !meeting.requires_approval || 
                   participant?.role === ParticipantRole.HOST;
                   // TODO: Add is_approved field to participant entity

    return {
      room: meeting,
      participant_status: participant ? {
        role: participant.role,
        is_online: participant.is_online,
        joined_at: participant.joined_at
        // TODO: Add is_approved field
      } : null,
      can_join: canJoin,
      payment_required: meeting.pricing_type === PricingType.CREDITS && meeting.price_credits > 0,
      user_credits: user.credit_balance
    };
  }

  // Community Features
  async getGlobalChatRooms(paginationDto: PaginationDto) {
    // TODO: Implement global chat rooms
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }

  async getRoomsByTopic(topic: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [rooms, total] = await this.meetingRepository.findAndCount({
      where: { topic, status: MeetingStatus.LIVE, is_private: false },
      relations: ['host'],
      order: { created_at: 'DESC' },
      skip,
      take: limit
    });

    return {
      data: rooms,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getUserRooms(userId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [rooms, total] = await this.meetingRepository.findAndCount({
      where: { host: { id: userId } },
      relations: ['host', 'participants'],
      order: { created_at: 'DESC' },
      skip,
      take: limit
    });

    return {
      data: rooms,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getUserClasses(userId: string, paginationDto: PaginationDto, role?: 'teacher' | 'student') {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    let queryBuilder;

    if (role === 'teacher') {
      // Classes user is teaching
      queryBuilder = this.meetingRepository.createQueryBuilder('meeting')
        .leftJoinAndSelect('meeting.participants', 'participants')
        .where('meeting.host_id = :userId', { userId })
        .andWhere('meeting.meeting_type = :type', { type: MeetingType.TEACHER_CLASS });
    } else if (role === 'student') {
      // Classes user is enrolled in
      queryBuilder = this.meetingRepository.createQueryBuilder('meeting')
        .leftJoinAndSelect('meeting.host', 'host')
        .leftJoin('meeting.participants', 'participant')
        .where('participant.user_id = :userId', { userId })
        .andWhere('meeting.meeting_type = :type', { type: MeetingType.TEACHER_CLASS });
    } else {
      // All classes (teaching + enrolled)
      queryBuilder = this.meetingRepository.createQueryBuilder('meeting')
        .leftJoinAndSelect('meeting.host', 'host')
        .leftJoin('meeting.participants', 'participant')
        .where('(meeting.host_id = :userId OR participant.user_id = :userId)', { userId })
        .andWhere('meeting.meeting_type = :type', { type: MeetingType.TEACHER_CLASS });
    }

    const [classes, total] = await queryBuilder
      .orderBy('meeting.scheduled_at IS NULL', 'ASC')
      .addOrderBy('meeting.scheduled_at', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: classes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async validatePayment(roomId: string, user: User) {
    const meeting = await this.meetingRepository.findOne({ where: { id: roomId } });
    
    if (!meeting) {
      throw new NotFoundException('Room not found');
    }

    if (meeting.pricing_type === PricingType.FREE) {
      return { payment_required: false, can_join: true };
    }

    const canAfford = user.credit_balance >= meeting.price_credits;

    return {
      payment_required: true,
      price_credits: meeting.price_credits,
      user_credits: user.credit_balance,
      can_afford: canAfford,
      can_join: canAfford
    };
  }
}