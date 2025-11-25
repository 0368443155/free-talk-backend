import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { GlobalChatMessage, GlobalMessageType } from './entities/global-chat-message.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class GlobalChatService {
  private readonly logger = new Logger(GlobalChatService.name);

  constructor(
    @InjectRepository(GlobalChatMessage)
    private readonly chatMessageRepository: Repository<GlobalChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get chat messages with pagination
   */
  async getMessages(options: {
    page?: number;
    limit?: number;
    before?: Date;
  }): Promise<{
    data: GlobalChatMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 50, before } = options;
    const skip = (page - 1) * limit;

    try {
      const qb = this.chatMessageRepository.createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .orderBy('message.created_at', 'DESC');

      if (before) {
        qb.where('message.created_at < :before', { before });
      }

      const [data, total] = await qb
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Reverse to show oldest first
      const reversedData = data.reverse();

      return {
        data: reversedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error fetching global chat messages:', error);
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

  /**
   * Create a new chat message
   */
  async createMessage(
    userId: string,
    message: string,
    type: GlobalMessageType = GlobalMessageType.TEXT,
    metadata?: any,
  ): Promise<GlobalChatMessage> {
    if (!message || !message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (message.length > 1000) {
      throw new BadRequestException('Message is too long (max 1000 characters)');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create message with sender_id directly to avoid foreign key issues
    const chatMessage = this.chatMessageRepository.create({
      sender_id: userId, // Set sender_id directly instead of relation
      message: message.trim(),
      type,
      metadata,
    });

    try {
      const saved = await this.chatMessageRepository.save(chatMessage);

      // Load with sender relation after save
      const messageWithSender = await this.chatMessageRepository.findOne({
        where: { id: saved.id },
        relations: ['sender'],
      });

      if (!messageWithSender) {
        // If relation load fails, return saved message without relation
        this.logger.warn(`Failed to load sender relation for message ${saved.id}`);
        return saved;
      }

      return messageWithSender;
    } catch (error) {
      this.logger.error(`Failed to save global chat message: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a message (for moderation)
   */
  async deleteMessage(messageId: string, adminId: string): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is admin or message owner
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || (admin.role !== 'admin' && message.sender_id !== adminId)) {
      throw new BadRequestException('Unauthorized to delete this message');
    }

    await this.chatMessageRepository.remove(message);
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<GlobalChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  /**
   * Delete messages older than 24 hours (cleanup job)
   * Runs every hour to clean up old messages
   */
  @Cron('0 * * * *') // Every hour at minute 0
  async deleteOldMessages(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const result = await this.chatMessageRepository
        .createQueryBuilder()
        .delete()
        .where('created_at < :date', { date: twentyFourHoursAgo })
        .execute();

      const deletedCount = result.affected || 0;
      if (deletedCount > 0) {
        this.logger.log(`🧹 Cleaned up ${deletedCount} global chat messages older than 24 hours`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to clean up old global chat messages: ${error.message}`, error.stack);
    }
  }
}

