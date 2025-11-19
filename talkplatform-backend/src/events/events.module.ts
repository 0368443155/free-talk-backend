import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AppService } from '../app.service';

@Module({
  providers: [AppService, EventsGateway], // Provide AppService trong EventsModule
  exports: [EventsGateway]
})
export class EventsModule {}