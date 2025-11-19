import { Module, forwardRef } from '@nestjs/common';
import { LiveKitService } from './livekit.service';
import { LiveKitController } from './livekit.controller';
import { MeetingsModule } from '../features/meeting/meetings.module';

@Module({
  imports: [forwardRef(() => MeetingsModule)],
  providers: [LiveKitService],
  controllers: [LiveKitController],
  exports: [LiveKitService],
})
export class LiveKitModule {}