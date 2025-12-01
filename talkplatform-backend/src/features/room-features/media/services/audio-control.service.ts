import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant } from '../../../meeting/entities/meeting-participant.entity';

@Injectable()
export class AudioControlService {
  private readonly logger = new Logger(AudioControlService.name);

  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
  ) {}

  /**
   * Toggle microphone mute state
   */
  async toggleMic(
    roomId: string,
    userId: string,
    isMuted: boolean,
  ): Promise<void> {
    await this.participantRepository.update(
      {
        meeting: { id: roomId },
        user: { id: userId },
      },
      { is_muted: isMuted },
    );

    this.logger.log(`User ${userId} ${isMuted ? 'muted' : 'unmuted'} in room ${roomId}`);
  }

  /**
   * Get mute state
   */
  async getMuteState(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: roomId },
        user: { id: userId },
      },
    });

    return participant?.is_muted || false;
  }

  /**
   * Mute all participants (host action)
   */
  async muteAll(roomId: string, exceptUserId?: string): Promise<void> {
    const updateQuery: any = {
      meeting: { id: roomId },
      is_muted: false,
    };

    if (exceptUserId) {
      updateQuery.user = { id: { $ne: exceptUserId } } as any;
    }

    await this.participantRepository.update(updateQuery, { is_muted: true });

    this.logger.log(`All participants muted in room ${roomId}`);
  }

  /**
   * Unmute all participants (host action)
   */
  async unmuteAll(roomId: string): Promise<void> {
    await this.participantRepository.update(
      {
        meeting: { id: roomId },
      },
      { is_muted: false },
    );

    this.logger.log(`All participants unmuted in room ${roomId}`);
  }
}

