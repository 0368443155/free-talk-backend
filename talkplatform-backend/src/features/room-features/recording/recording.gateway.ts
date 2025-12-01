import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { BaseRoomGateway } from '../../../core/room/gateways/base-room.gateway';
import { RoomFactoryService } from '../../../core/room/services/room-factory.service';
import { RoomStateManagerService } from '../../../core/room/services/room-state-manager.service';
import { RoomFeature } from '../../../core/room/enums/room-feature.enum';
import { RecordingService } from './services/recording.service';
import { StartRecordingDto } from './dto/start-recording.dto';

@WebSocketGateway({
  namespace: '/recording',
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class RecordingGateway extends BaseRoomGateway {
  constructor(
    roomFactory: RoomFactoryService,
    roomStateManager: RoomStateManagerService,
    private readonly recordingService: RecordingService,
  ) {
    super(roomFactory, roomStateManager);
  }

  /**
   * Start recording
   */
  @SubscribeMessage('recording:start')
  async handleStartRecording(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: StartRecordingDto,
  ) {
    try {
      // Check if recording feature is enabled
      const hasRecording = await this.hasFeature(dto.roomId, RoomFeature.RECORDING);
      if (!hasRecording) {
        throw new WsException('Recording is disabled in this room');
      }

      // Validate client is in room
      const inRoom = await this.validateClientInRoom(client, dto.roomId);
      if (!inRoom) {
        throw new WsException('You are not in this room');
      }

      const userId = this.getUserId(client);
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      // Get room info
      const roomInfo = await this.getRoomInfo(dto.roomId);

      // Start recording
      const recording = await this.recordingService.startRecording(
        dto.roomId,
        roomInfo.type,
        dto.livekitRoomName,
        userId,
        dto.quality,
      );

      // Broadcast to room
      this.broadcastToRoom(dto.roomId, 'recording:started', {
        recordingId: recording.id,
        startedAt: recording.startedAt,
        initiatedBy: userId,
      });

      return {
        success: true,
        recording,
      };
    } catch (error) {
      this.logger.error(`Start recording error: ${error.message}`);
      throw new WsException(error.message || 'Failed to start recording');
    }
  }

  /**
   * Stop recording
   */
  @SubscribeMessage('recording:stop')
  async handleStopRecording(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recordingId: string; roomId: string },
  ) {
    try {
      const userId = this.getUserId(client);
      if (!userId) {
        throw new WsException('User not authenticated');
      }

      // Stop recording
      const recording = await this.recordingService.stopRecording(
        data.recordingId,
        userId,
      );

      // Broadcast to room
      this.broadcastToRoom(data.roomId, 'recording:stopped', {
        recordingId: recording.id,
        endedAt: recording.endedAt,
      });

      return {
        success: true,
        recording,
      };
    } catch (error) {
      this.logger.error(`Stop recording error: ${error.message}`);
      throw new WsException(error.message || 'Failed to stop recording');
    }
  }

  /**
   * Get room information
   */
  protected async getRoomInfo(roomId: string): Promise<{
    id: string;
    type: string;
    [key: string]: any;
  }> {
    if (!this.roomStateManager) {
      throw new Error('RoomStateManager not available');
    }
    
    const roomState = await this.roomStateManager.getRoomState(roomId);
    if (roomState) {
      return { id: roomId, type: roomState.roomType };
    }
    throw new Error('Room not found');
  }
}

