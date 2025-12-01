import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingType, PricingType } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { RoomFactoryService } from '../../../core/room/services/room-factory.service';
import { BaseRoomService } from '../../../core/room/services/base-room.service';
import { AccessValidatorService } from '../../../core/access-control/services/access-validator.service';
import { RoomType } from '../../../core/room/enums/room-type.enum';
import { FREE_TALK_ROOM_CONFIG } from '../../../core/room/configs/free-talk-room.config';
import { EventBusService } from '../../../infrastructure/event-bus/services/event-bus.service';
import { RoomCreatedEvent } from '../../../infrastructure/event-bus/events/room-events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FreeTalkRoomService {
  private readonly logger = new Logger(FreeTalkRoomService.name);

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
   * Create a free talk room
   */
  async createRoom(hostId: string, title: string, description?: string): Promise<Meeting> {
    // Get host
    const host = await this.userRepository.findOne({ where: { id: hostId } });
    if (!host) {
      throw new Error('Host not found');
    }

    // Create meeting entity
    const meeting = this.meetingRepository.create({
      id: uuidv4(),
      title,
      description,
      meeting_type: MeetingType.FREE_TALK,
      host,
      max_participants: FREE_TALK_ROOM_CONFIG.maxParticipants,
      pricing_type: PricingType.FREE,
      price_credits: 0,
      is_private: false,
      is_locked: false,
      status: 'scheduled' as any,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Initialize room with factory
    await this.roomFactory.createRoom(
      RoomType.FREE_TALK,
      savedMeeting.id,
      hostId,
    );

    // Publish event
    await this.eventBus.publish(
      new RoomCreatedEvent({
        roomId: savedMeeting.id,
        roomType: RoomType.FREE_TALK,
        hostId,
        createdAt: new Date(),
      }),
    );

    this.logger.log(`Free talk room ${savedMeeting.id} created by ${hostId}`);

    return savedMeeting;
  }

  /**
   * Join free talk room
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    // Validate access
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

    // Add participant to room state
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    await this.baseRoomService.addParticipant(
      roomId,
      userId,
      user.username,
    );

    this.logger.log(`User ${userId} joined free talk room ${roomId}`);
  }

  /**
   * Get room details
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

