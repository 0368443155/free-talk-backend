import { Module } from '@nestjs/common';
import { ReactionsService } from './services/reactions.service';
import { ReactionsGateway } from './gateways/reactions.gateway';
import { RoomModule } from '../../../core/room/room.module';

@Module({
  imports: [RoomModule],
  providers: [
    ReactionsService,
    ReactionsGateway,
  ],
  exports: [
    ReactionsService,
    ReactionsGateway,
  ],
})
export class ReactionsModule {}

