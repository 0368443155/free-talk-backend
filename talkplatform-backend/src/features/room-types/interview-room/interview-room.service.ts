import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingType, PricingType } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { RoomFactoryService } from '../../../core/room/services/room-factory.service';
import { BaseRoomService } from '../../../core/room/services/base-room.service';
import { AccessValidatorService } from '../../../core/access-control/services/access-validator.service';
import { RoomType } from '../../../core/room/enums/room-type.enum';
import { INTERVIEW_ROOM_CONFIG } from '../../../core/room/configs/interview-room.config';
import { EventBusService } from '../../../infrastructure/event-bus/services/event-bus.service';
import { RoomCreatedEvent } from '../../../infrastructure/event-bus/events/room-events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InterviewRoomService {
  private readonly logger = new Logger(InterviewRoomService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly roomFactory: RoomFactoryService,
    private readonly baseRoomService: BaseRoomService,
    private readonly accessValidator: AccessValidatorService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Create an interview room
   */
  async createRoom(
    hostId: string,
    intervieweeId: string,
    title?: string,
  ): Promise<Meeting> {
    const host = await this.userRepository.findOne({ where: { id: hostId } });
    if (!host) {
      throw new Error('Host not found');
    }

    const interviewee = await this.userRepository.findOne({
      where: { id: intervieweeId },
    });
    if (!interviewee) {
      throw new Error('Interviewee not found');
    }

    const meeting = this.meetingRepository.create({
      id: uuidv4(),
      title: title || `Interview: ${interviewee.username}`,
      description: `One-on-one interview session`,
      meeting_type: MeetingType.PRIVATE_SESSION,
      host,
      max_participants: INTERVIEW_ROOM_CONFIG.maxParticipants,
      pricing_type: PricingType.FREE,
      price_credits: 0,
      is_private: true,
      is_locked: false,
      status: 'scheduled' as any,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Initialize room with factory
    await this.roomFactory.createRoom(
      RoomType.INTERVIEW,
      savedMeeting.id,
      hostId,
    );

    // Publish event
    await this.eventBus.publish(
      new RoomCreatedEvent({
        roomId: savedMeeting.id,
        roomType: RoomType.INTERVIEW,
        hostId,
        createdAt: new Date(),
      }),
    );

    this.logger.log(
      `Interview room ${savedMeeting.id} created by ${hostId} for ${intervieweeId}`,
    );

    return savedMeeting;
  }

  /**
   * Join interview room
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    const roomConfig = this.baseRoomService.getRoomConfig(roomId);
    if (!roomConfig) {
      throw new Error('Room configuration not found');
    }

    const validationResult = await this.accessValidator.validateRoomAccess(
      userId,
      roomId,
      roomConfig,
    );

    if (!validationResult.granted) {
      throw new Error(validationResult.reason || 'Access denied');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    await this.baseRoomService.addParticipant(roomId, userId, user.username);

    this.logger.log(`User ${userId} joined interview room ${roomId}`);
  }

  /**
   * Get interview room details
   */
  async getRoomDetails(roomId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host', 'participants', 'participants.user'],
    });

    if (!meeting) {
      throw new Error('Room not found');
    }

    return meeting;
  }
}

