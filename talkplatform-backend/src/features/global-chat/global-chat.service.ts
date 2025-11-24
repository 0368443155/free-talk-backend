import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalChatMessage, GlobalMessageType } from './entities/global-chat-message.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class GlobalChatService {
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

    const chatMessage = this.chatMessageRepository.create({
      sender: user,
      sender_id: userId,
      message: message.trim(),
      type,
      metadata,
    });

    const saved = await this.chatMessageRepository.save(chatMessage);

    // Load with sender relation
    return this.chatMessageRepository.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    }) as Promise<GlobalChatMessage>;
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
}

