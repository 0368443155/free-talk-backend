import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingChatMessage, MessageType } from '../../../meeting/entities/meeting-chat-message.entity';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { User } from '../../../../users/user.entity';
import { SendMessageInterface, EditMessageInterface, DeleteMessageInterface } from '../interfaces/chat-message.interface';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(MeetingChatMessage)
    private readonly chatMessageRepository: Repository<MeetingChatMessage>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Send a chat message
   */
  async sendMessage(
    roomId: string,
    userId: string,
    dto: SendMessageInterface,
  ): Promise<MeetingChatMessage> {
    // Check if room has chat feature
    const hasChat = await this.baseRoomService.hasFeature(roomId, RoomFeature.CHAT);
    if (!hasChat) {
      throw new ForbiddenException('Chat is disabled in this room');
    }

    // Get user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get meeting
    const meeting = await this.meetingRepository.findOne({ where: { id: roomId } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Create message
    const chatMessage = this.chatMessageRepository.create({
      meeting: { id: roomId },
      sender: user,
      message: dto.message,
      type: dto.type || MessageType.TEXT,
      metadata: dto.replyTo ? { reply_to: dto.replyTo } : null,
    });

    const savedMessage = await this.chatMessageRepository.save(chatMessage);

    this.logger.log(`Message sent by ${user.username} in room ${roomId}`);

    return savedMessage;
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    dto: EditMessageInterface,
  ): Promise<MeetingChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'meeting'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is the sender
    if (message.sender.id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Update message
    message.message = dto.newMessage;
    const updatedMessage = await this.chatMessageRepository.save(message);

    this.logger.log(`Message ${messageId} edited by ${userId}`);

    return updatedMessage;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'meeting'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is the sender or has moderation permission
    // TODO: Add moderation permission check
    if (message.sender.id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.chatMessageRepository.remove(message);

    this.logger.log(`Message ${messageId} deleted by ${userId}`);
  }

  /**
   * Get chat history
   */
  async getChatHistory(
    roomId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MeetingChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { meeting: { id: roomId } },
      relations: ['sender'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Add reaction to message
   */
  async addReaction(
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<MeetingChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Get existing reactions or initialize
    const reactions = message.metadata?.reactions || {};
    if (!reactions[reaction]) {
      reactions[reaction] = [];
    }

    // Add user to reaction if not already there
    if (!reactions[reaction].includes(userId)) {
      reactions[reaction].push(userId);
    }

    // Update message metadata
    message.metadata = {
      ...message.metadata,
      reactions,
    };

    return this.chatMessageRepository.save(message);
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    reaction: string,
  ): Promise<MeetingChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const reactions = message.metadata?.reactions || {};
    if (reactions[reaction]) {
      reactions[reaction] = reactions[reaction].filter((id: string) => id !== userId);
      if (reactions[reaction].length === 0) {
        delete reactions[reaction];
      }
    }

    message.metadata = {
      ...message.metadata,
      reactions,
    };

    return this.chatMessageRepository.save(message);
  }
}

