import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
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
      // Build where condition
      const whereCondition: any = {};
      if (before) {
        whereCondition.created_at = LessThan(before);
      }

      // First, get total count (simple count without relations)
      const total = await this.chatMessageRepository.count({
        where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      });

      // Then, get data and load users separately
      const findOptions: any = {
        order: { created_at: 'DESC' },
        skip,
        take: limit,
      };

      if (Object.keys(whereCondition).length > 0) {
        findOptions.where = whereCondition;
      }

      const data = await this.chatMessageRepository.find(findOptions);

      // Load users for all messages
      const userIds = data.map(m => m.user_id).filter((id): id is string => id !== null);
      if (userIds.length > 0) {
        const users = await this.userRepository.find({
          where: { id: In(userIds) },
        });
        const userMap = new Map(users.map(u => [u.id, u]));
        data.forEach(message => {
          if (message.user_id) {
            message.sender = userMap.get(message.user_id) || null;
          }
        });
      }

      // Reverse to show oldest first
      const reversedData = data.reverse();

      // Transform messages to match frontend interface (sender.user_id instead of sender.id)
      const transformedData = reversedData.map(message => ({
        ...message,
        sender: message.sender ? {
          user_id: message.sender.id,
          username: message.sender.username,
          avatar_url: message.sender.avatar_url || undefined,
        } : null,
      }));

      return {
        data: transformedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error fetching global chat messages:', error);
      this.logger.error('Error stack:', error.stack);
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

    // Create message with user_id (mapped to user_id column in DB)
    // Note: 'type' and 'metadata' columns don't exist in old database, so we don't set them
    const chatMessage = this.chatMessageRepository.create({
      user_id: userId, // Set user_id directly
      message: message.trim(),
      room_type: 'lobby', // Default room type for old schema compatibility
      is_system_message: type === GlobalMessageType.SYSTEM,
      is_deleted: false,
    });
    
    // Set virtual properties for code compatibility (not saved to DB)
    chatMessage.type = type || GlobalMessageType.TEXT;
    chatMessage.metadata = metadata || null;

    try {
      const saved = await this.chatMessageRepository.save(chatMessage);

      // Load user separately and assign to sender property
      const loadedUser = await this.userRepository.findOne({ where: { id: userId } });
      if (loadedUser) {
        saved.sender = loadedUser;
      }

      // Transform to match frontend interface
      return {
        ...saved,
        sender: saved.sender ? {
          user_id: saved.sender.id,
          username: saved.sender.username,
          avatar_url: saved.sender.avatar_url || undefined,
        } : null,
      } as any;
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
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is admin or message owner
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || (admin.role !== 'admin' && message.user_id !== adminId)) {
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
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Load user if user_id exists
    if (message.user_id) {
      const user = await this.userRepository.findOne({ where: { id: message.user_id } });
      if (user) {
        message.sender = user;
      }
    }

    // Transform to match frontend interface
    return {
      ...message,
      sender: message.sender ? {
        user_id: message.sender.id,
        username: message.sender.username,
        avatar_url: message.sender.avatar_url || undefined,
      } : null,
    } as any;
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

