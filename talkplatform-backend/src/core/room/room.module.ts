import { Module } from '@nestjs/common';
import { BaseRoomService } from './services/base-room.service';
import { RoomFactoryService } from './services/room-factory.service';
import { RoomStateManagerService } from './services/room-state-manager.service';
import { RoomLifecycleService } from './services/room-lifecycle.service';
import { UserSocketManagerService } from './services/user-socket-manager.service';
import { RoomAccessGuard } from './guards/room-access.guard';
import { RoomFeatureGuard } from './guards/room-feature.guard';

@Module({
  providers: [
    BaseRoomService,
    RoomFactoryService,
    RoomStateManagerService,
    RoomLifecycleService,
    UserSocketManagerService,
    RoomAccessGuard,
    RoomFeatureGuard,
  ],
  exports: [
    BaseRoomService,
    RoomFactoryService,
    RoomStateManagerService,
    RoomLifecycleService,
    UserSocketManagerService,
    RoomAccessGuard,
    RoomFeatureGuard,
  ],
})
export class RoomModule {}

