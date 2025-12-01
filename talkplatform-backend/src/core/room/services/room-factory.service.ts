import { Injectable, Logger } from '@nestjs/common';
import { RoomType } from '../enums/room-type.enum';
import { RoomConfig } from '../interfaces/room-config.interface';
import { getRoomConfig } from '../configs/room-configs.constant';
import { BaseRoomService } from './base-room.service';

@Injectable()
export class RoomFactoryService {
  private readonly logger = new Logger(RoomFactoryService.name);

  constructor(
    private readonly baseRoomService: BaseRoomService,
  ) {}

  /**
   * Create a room with the specified type
   */
  async createRoom(
    roomType: RoomType,
    roomId: string,
    hostId: string,
    customConfig?: Partial<RoomConfig>,
  ): Promise<string> {
    // Get base configuration
    const baseConfig = getRoomConfig(roomType);

    // Merge with custom config if provided
    const config: RoomConfig = customConfig
      ? {
          ...baseConfig,
          ...customConfig,
          features: customConfig.features || baseConfig.features,
          defaultSettings: {
            ...baseConfig.defaultSettings,
            ...customConfig.defaultSettings,
          },
          accessControl: {
            ...baseConfig.accessControl,
            ...customConfig.accessControl,
          },
          livekitSettings: {
            ...baseConfig.livekitSettings,
            ...customConfig.livekitSettings,
          },
          stateManagement: {
            ...baseConfig.stateManagement,
            ...customConfig.stateManagement,
          },
        }
      : baseConfig;

    // Initialize room
    await this.baseRoomService.initializeRoom(roomId, config, hostId);

    this.logger.log(`Room ${roomId} created with type ${roomType}`);

    return roomId;
  }

  /**
   * Get room configuration by type
   */
  getRoomConfigByType(roomType: RoomType): RoomConfig {
    return getRoomConfig(roomType);
  }

  /**
   * Create room with custom features
   */
  async createRoomWithFeatures(
    roomType: RoomType,
    roomId: string,
    hostId: string,
    features: string[],
  ): Promise<string> {
    const baseConfig = getRoomConfig(roomType);
    
    // Import RoomFeature enum dynamically
    const { RoomFeature } = await import('../enums/room-feature.enum');
    
    // Validate features
    const validFeatures = features.filter(f =>
      Object.values(RoomFeature).includes(f as RoomFeature),
    ) as RoomFeature[];

    const customConfig: Partial<RoomConfig> = {
      features: validFeatures,
    };

    return this.createRoom(roomType, roomId, hostId, customConfig);
  }
}

