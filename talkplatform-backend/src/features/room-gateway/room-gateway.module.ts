import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UnifiedRoomGateway } from './unified-room.gateway';
import { RoomModule } from '../../core/room/room.module';
import { AccessControlModule } from '../../core/access-control/access-control.module';
import { Meeting } from '../meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, User]),
    RoomModule,
    AccessControlModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  providers: [UnifiedRoomGateway],
  exports: [UnifiedRoomGateway],
})
export class RoomGatewayModule {}

