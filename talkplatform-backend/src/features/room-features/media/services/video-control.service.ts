import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant } from '../../../meeting/entities/meeting-participant.entity';

@Injectable()
export class VideoControlService {
  private readonly logger = new Logger(VideoControlService.name);

  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
  ) {}

  /**
   * Toggle video on/off
   */
  async toggleVideo(
    roomId: string,
    userId: string,
    isVideoOff: boolean,
  ): Promise<void> {
    await this.participantRepository.update(
      {
        meeting: { id: roomId },
        user: { id: userId },
      },
      { is_video_off: isVideoOff },
    );

    this.logger.log(`User ${userId} video ${isVideoOff ? 'turned off' : 'turned on'} in room ${roomId}`);
  }

  /**
   * Get video state
   */
  async getVideoState(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: roomId },
        user: { id: userId },
      },
    });

    return participant?.is_video_off || false;
  }

  /**
   * Turn off video for all participants (host action)
   */
  async turnOffVideoForAll(roomId: string, exceptUserId?: string): Promise<void> {
    const updateQuery: any = {
      meeting: { id: roomId },
      is_video_off: false,
    };

    if (exceptUserId) {
      updateQuery.user = { id: { $ne: exceptUserId } } as any;
    }

    await this.participantRepository.update(updateQuery, { is_video_off: true });

    this.logger.log(`All participants video turned off in room ${roomId}`);
  }
}

