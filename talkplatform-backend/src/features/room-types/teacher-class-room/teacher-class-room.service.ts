import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingType, MeetingStatus, PricingType } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { RoomFactoryService } from '../../../core/room/services/room-factory.service';
import { BaseRoomService } from '../../../core/room/services/base-room.service';
import { AccessValidatorService } from '../../../core/access-control/services/access-validator.service';
import { RoomType } from '../../../core/room/enums/room-type.enum';
import { TEACHER_CLASS_ROOM_CONFIG } from '../../../core/room/configs/teacher-class-room.config';
import { EventBusService } from '../../../infrastructure/event-bus/services/event-bus.service';
import { RoomCreatedEvent } from '../../../infrastructure/event-bus/events/room-events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeacherClassRoomService {
  private readonly logger = new Logger(TeacherClassRoomService.name);

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
   * Create a teacher class room
   */
  async createRoom(
    hostId: string,
    title: string,
    description?: string,
    scheduledAt?: Date,
  ): Promise<Meeting> {
    // Get host (should be teacher)
    const host = await this.userRepository.findOne({ where: { id: hostId } });
    if (!host) {
      throw new Error('Host not found');
    }

    // Create meeting entity
    const meeting = this.meetingRepository.create({
      title,
      description,
      meeting_type: MeetingType.TEACHER_CLASS,
      host,
      max_participants: TEACHER_CLASS_ROOM_CONFIG.maxParticipants,
      pricing_type: PricingType.CREDITS,
      price_credits: 1, // Default price
      is_private: false,
      is_locked: false,
      status: scheduledAt && scheduledAt > new Date() ? MeetingStatus.SCHEDULED : MeetingStatus.LIVE,
      scheduled_at: scheduledAt,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Initialize room with factory
    await this.roomFactory.createRoom(
      RoomType.TEACHER_CLASS,
      savedMeeting.id,
      hostId,
    );

    // Publish event
    await this.eventBus.publish(
      new RoomCreatedEvent({
        roomId: savedMeeting.id,
        roomType: RoomType.TEACHER_CLASS,
        hostId,
        createdAt: new Date(),
      }),
    );

    this.logger.log(`Teacher class room ${savedMeeting.id} created by ${hostId}`);

    return savedMeeting;
  }

  /**
   * Join teacher class room (requires payment)
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    // Validate access (includes payment check)
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

    // Add participant
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    await this.baseRoomService.addParticipant(
      roomId,
      userId,
      user.username,
    );

    this.logger.log(`User ${userId} joined teacher class room ${roomId}`);
  }

  /**
   * Get teacher class room details
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

