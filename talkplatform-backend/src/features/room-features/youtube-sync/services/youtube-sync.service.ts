import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { YouTubeState } from '../interfaces/youtube-state.interface';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class YouTubeSyncService {
  private readonly logger = new Logger(YouTubeSyncService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Get YouTube state for a room
   */
  async getState(roomId: string): Promise<YouTubeState> {
    const meeting = await this.meetingRepository.findOne({
      where: { id: roomId },
      select: ['youtube_video_id', 'youtube_current_time', 'youtube_is_playing'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return {
      videoId: meeting.youtube_video_id,
      currentTime: meeting.youtube_current_time || 0,
      isPlaying: meeting.youtube_is_playing || false,
    };
  }

  /**
   * Update YouTube state
   */
  async updateState(
    roomId: string,
    state: Partial<YouTubeState>,
    userId?: string,
  ): Promise<YouTubeState> {
    // Check if room has YouTube sync feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.YOUTUBE_SYNC,
    );
    if (!hasFeature) {
      throw new Error('YouTube sync is disabled in this room');
    }

    const updateData: any = {};
    if (state.videoId !== undefined) {
      updateData.youtube_video_id = state.videoId;
    }
    if (state.currentTime !== undefined) {
      updateData.youtube_current_time = state.currentTime;
    }
    if (state.isPlaying !== undefined) {
      updateData.youtube_is_playing = state.isPlaying;
    }

    await this.meetingRepository.update({ id: roomId }, updateData);

    const updated = await this.getState(roomId);
    this.logger.log(`YouTube state updated for room ${roomId} by user ${userId}`);

    return updated;
  }

  /**
   * Play video
   */
  async play(
    roomId: string,
    videoId: string,
    currentTime: number,
    userId?: string,
  ): Promise<YouTubeState> {
    return this.updateState(
      roomId,
      {
        videoId,
        currentTime,
        isPlaying: true,
      },
      userId,
    );
  }

  /**
   * Pause video
   */
  async pause(roomId: string, currentTime: number, userId?: string): Promise<YouTubeState> {
    return this.updateState(
      roomId,
      {
        currentTime,
        isPlaying: false,
      },
      userId,
    );
  }

  /**
   * Seek to time
   */
  async seek(roomId: string, currentTime: number, userId?: string): Promise<YouTubeState> {
    return this.updateState(
      roomId,
      {
        currentTime,
      },
      userId,
    );
  }

  /**
   * Clear video
   */
  async clear(roomId: string, userId?: string): Promise<void> {
    await this.updateState(
      roomId,
      {
        videoId: null,
        currentTime: 0,
        isPlaying: false,
      },
      userId,
    );
  }
}

