import { WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoomFactoryService } from '../services/room-factory.service';
import { RoomFeature } from '../enums/room-feature.enum';
import { RoomStateManagerService } from '../services/room-state-manager.service';

/**
 * Base Room Gateway
 * Provides common functionality for all room-related gateways
 */
export abstract class BaseRoomGateway {
  @WebSocketServer()
  protected server: Server;

  protected readonly logger: Logger;

  constructor(
    protected readonly roomFactory: RoomFactoryService,
    protected readonly roomStateManager?: RoomStateManagerService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Check if a room has a specific feature enabled
   */
  protected async hasFeature(
    roomId: string,
    feature: RoomFeature,
  ): Promise<boolean> {
    try {
      const room = await this.getRoomInfo(roomId);
      const roomConfig = this.roomFactory.getRoomConfig(room.type);
      
      if (!roomConfig) {
        return false;
      }

      return roomConfig.features.includes(feature);
    } catch (error) {
      this.logger.error(`Error checking feature: ${error.message}`);
      return false;
    }
  }

  /**
   * Get room information from database or cache
   */
  protected abstract getRoomInfo(roomId: string): Promise<{
    id: string;
    type: string;
    [key: string]: any;
  }>;

  /**
   * Broadcast event to all clients in a room
   */
  protected broadcastToRoom(roomId: string, event: string, data: any): void {
    this.server.to(roomId).emit(event, data);
  }

  /**
   * Broadcast event to all clients except sender
   */
  protected broadcastToRoomExcept(
    roomId: string,
    socketId: string,
    event: string,
    data: any,
  ): void {
    this.server.to(roomId).except(socketId).emit(event, data);
  }

  /**
   * Send event to specific client
   */
  protected sendToClient(socketId: string, event: string, data: any): void {
    this.server.to(socketId).emit(event, data);
  }

  /**
   * Validate client is in room
   */
  protected async validateClientInRoom(
    client: Socket,
    roomId: string,
  ): Promise<boolean> {
    const rooms = Array.from(client.rooms);
    return rooms.includes(roomId);
  }

  /**
   * Get user ID from socket
   */
  protected getUserId(client: Socket): string | null {
    return client.data?.userId || null;
  }

  /**
   * Get username from socket
   */
  protected getUsername(client: Socket): string | null {
    return client.data?.username || null;
  }
}

