import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingType, PricingType } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { Lesson } from '../../courses/entities/lesson.entity';
import { RoomFactoryService } from '../../../core/room/services/room-factory.service';
import { BaseRoomService } from '../../../core/room/services/base-room.service';
import { AccessValidatorService } from '../../../core/access-control/services/access-validator.service';
import { RoomType } from '../../../core/room/enums/room-type.enum';
import { LESSON_ROOM_CONFIG } from '../../../core/room/configs/lesson-room.config';
import { EventBusService } from '../../../infrastructure/event-bus/services/event-bus.service';
import { RoomCreatedEvent } from '../../../infrastructure/event-bus/events/room-events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LessonRoomService {
  private readonly logger = new Logger(LessonRoomService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly roomFactory: RoomFactoryService,
    private readonly baseRoomService: BaseRoomService,
    private readonly accessValidator: AccessValidatorService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Create a lesson room
   */
  async createRoom(
    hostId: string,
    lessonId: string,
    title?: string,
  ): Promise<Meeting> {
    // Get lesson
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course', 'course.teacher'],
    });

    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Get host (should be teacher)
    const host = await this.userRepository.findOne({ where: { id: hostId } });
    if (!host) {
      throw new Error('Host not found');
    }

    // Create meeting entity
    const meeting = this.meetingRepository.create({
      id: uuidv4(),
      title: title || lesson.title,
      description: lesson.description,
      meeting_type: MeetingType.FREE_TALK, // Will be updated to LESSON
      host,
      lesson_id: lessonId,
      max_participants: LESSON_ROOM_CONFIG.maxParticipants,
      pricing_type: PricingType.CREDITS,
      price_credits: 0, // Price comes from course/session, not lesson
      is_private: false,
      is_locked: false,
      status: 'scheduled' as any,
      scheduled_at: new Date(),
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Initialize room with factory
    await this.roomFactory.createRoom(
      RoomType.LESSON,
      savedMeeting.id,
      hostId,
    );

    // Publish event
    await this.eventBus.publish(
      new RoomCreatedEvent({
        roomId: savedMeeting.id,
        roomType: RoomType.LESSON,
        hostId,
        createdAt: new Date(),
      }),
    );

    this.logger.log(`Lesson room ${savedMeeting.id} created for lesson ${lessonId}`);

    return savedMeeting;
  }

  /**
   * Join lesson room (requires enrollment)
   */
  async joinRoom(roomId: string, userId: string): Promise<void> {
    // Validate access (includes enrollment check)
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

    this.logger.log(`User ${userId} joined lesson room ${roomId}`);
  }

  /**
   * Get lesson room details
   */
  async getRoomDetails(roomId: string): Promise<Meeting> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      relations: ['host', 'lesson', 'course', 'participants', 'participants.user'],
    });

    if (!meeting) {
      throw new Error('Room not found');
    }

    return meeting;
  }
}

