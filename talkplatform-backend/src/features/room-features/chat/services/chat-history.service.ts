import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingChatMessage } from '../../../meeting/entities/meeting-chat-message.entity';

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    @InjectRepository(MeetingChatMessage)
    private readonly chatMessageRepository: Repository<MeetingChatMessage>,
  ) {}

  /**
   * Get chat history for a room
   */
  async getHistory(
    roomId: string,
    limit: number = 50,
    before?: Date,
  ): Promise<MeetingChatMessage[]> {
    const query = this.chatMessageRepository
      .createQueryBuilder('message')
      .where('message.meeting_id = :roomId', { roomId })
      .leftJoinAndSelect('message.sender', 'sender')
      .orderBy('message.created_at', 'DESC')
      .take(limit);

    if (before) {
      query.andWhere('message.created_at < :before', { before });
    }

    return query.getMany();
  }

  /**
   * Get messages after a certain date
   */
  async getMessagesAfter(
    roomId: string,
    after: Date,
  ): Promise<MeetingChatMessage[]> {
    return this.chatMessageRepository.find({
      where: {
        meeting: { id: roomId },
        created_at: { $gt: after } as any,
      },
      relations: ['sender'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Search messages
   */
  async searchMessages(
    roomId: string,
    query: string,
    limit: number = 20,
  ): Promise<MeetingChatMessage[]> {
    return this.chatMessageRepository
      .createQueryBuilder('message')
      .where('message.meeting_id = :roomId', { roomId })
      .andWhere('message.message LIKE :query', { query: `%${query}%` })
      .leftJoinAndSelect('message.sender', 'sender')
      .orderBy('message.created_at', 'DESC')
      .take(limit)
      .getMany();
  }
}

