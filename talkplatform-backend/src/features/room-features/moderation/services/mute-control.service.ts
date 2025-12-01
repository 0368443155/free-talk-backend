import { Injectable, Logger } from '@nestjs/common';
import { AudioControlService } from '../../media/services/audio-control.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class MuteControlService {
  private readonly logger = new Logger(MuteControlService.name);

  constructor(
    private readonly audioControl: AudioControlService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Mute user (host action)
   */
  async muteUser(
    roomId: string,
    targetUserId: string,
    hostId: string,
  ): Promise<void> {
    // Check if room has mute control feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.MUTE_CONTROL,
    );
    if (!hasFeature) {
      throw new Error('Mute control is disabled in this room');
    }

    // TODO: Verify host permission
    await this.audioControl.toggleMic(roomId, targetUserId, true);
    this.logger.log(`User ${targetUserId} muted by host ${hostId} in room ${roomId}`);
  }

  /**
   * Unmute user (host action)
   */
  async unmuteUser(
    roomId: string,
    targetUserId: string,
    hostId: string,
  ): Promise<void> {
    // Check if room has mute control feature
    const hasFeature = await this.baseRoomService.hasFeature(
      roomId,
      RoomFeature.MUTE_CONTROL,
    );
    if (!hasFeature) {
      throw new Error('Mute control is disabled in this room');
    }

    // TODO: Verify host permission
    await this.audioControl.toggleMic(roomId, targetUserId, false);
    this.logger.log(`User ${targetUserId} unmuted by host ${hostId} in room ${roomId}`);
  }
}

