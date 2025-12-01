import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ReactionsService } from '../services/reactions.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

interface SocketWithUser extends Socket {
  user?: any;
  userId?: string;
  meetingId?: string;
}

@WebSocketGateway({
  namespace: '/reactions',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@Injectable()
export class ReactionsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReactionsGateway.name);

  constructor(
    private readonly reactionsService: ReactionsService,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  @SubscribeMessage('reaction:add')
  async handleAddReaction(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { reaction: string },
  ) {
    if (!client.meetingId || !client.userId || !client.user) {
      return;
    }

    try {
      // Check if room has reactions feature
      const hasFeature = await this.baseRoomService.hasFeature(
        client.meetingId,
        RoomFeature.REACTIONS,
      );
      if (!hasFeature) {
        client.emit('reaction:error', { message: 'Reactions are disabled in this room' });
        return;
      }

      const reaction = await this.reactionsService.addReaction(
        client.meetingId,
        client.userId,
        client.user.username,
        data.reaction,
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('reaction:added', {
        reaction: reaction.reaction,
        userId: reaction.userId,
        username: reaction.username,
        timestamp: reaction.timestamp,
      });
    } catch (error) {
      this.logger.error(`Error adding reaction:`, error);
      client.emit('reaction:error', {
        message: error instanceof Error ? error.message : 'Failed to add reaction',
      });
    }
  }

  @SubscribeMessage('reaction:remove')
  async handleRemoveReaction(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() data: { reaction: string },
  ) {
    if (!client.meetingId || !client.userId) {
      return;
    }

    try {
      await this.reactionsService.removeReaction(
        client.meetingId,
        client.userId,
        data.reaction,
      );

      // Broadcast to room
      this.server.to(client.meetingId).emit('reaction:removed', {
        reaction: data.reaction,
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Error removing reaction:`, error);
      client.emit('reaction:error', {
        message: error instanceof Error ? error.message : 'Failed to remove reaction',
      });
    }
  }

  @SubscribeMessage('reaction:get')
  async handleGetReactions(@ConnectedSocket() client: SocketWithUser) {
    if (!client.meetingId) {
      return;
    }

    try {
      const reactions = this.reactionsService.getReactions(client.meetingId);
      
      // Convert Map to object for JSON serialization
      const reactionsObj: Record<string, any[]> = {};
      reactions.forEach((value, key) => {
        reactionsObj[key] = value;
      });

      client.emit('reaction:state', {
        reactions: reactionsObj,
      });
    } catch (error) {
      this.logger.error(`Error getting reactions:`, error);
      client.emit('reaction:error', {
        message: 'Failed to get reactions',
      });
    }
  }
}

