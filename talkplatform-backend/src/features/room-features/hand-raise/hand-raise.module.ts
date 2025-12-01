import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HandRaiseService } from './services/hand-raise.service';
import { HandRaiseGateway } from './gateways/hand-raise.gateway';
import { MeetingParticipant } from '../../meeting/entities/meeting-participant.entity';
import { RoomModule } from '../../../core/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingParticipant]),
    RoomModule,
  ],
  providers: [
    HandRaiseService,
    HandRaiseGateway,
  ],
  exports: [
    HandRaiseService,
    HandRaiseGateway,
  ],
})
export class HandRaiseModule {}

