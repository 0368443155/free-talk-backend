import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './services/chat.service';
import { ChatModerationService } from './services/chat-moderation.service';
import { ChatHistoryService } from './services/chat-history.service';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatPermissionGuard } from './guards/chat-permission.guard';
import { MeetingChatMessage } from '../../meeting/entities/meeting-chat-message.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';
import { User } from '../../../users/user.entity';
import { RoomModule } from '../../../core/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingChatMessage, Meeting, User]),
    RoomModule,
  ],
  providers: [
    ChatService,
    ChatModerationService,
    ChatHistoryService,
    ChatGateway,
    ChatPermissionGuard,
  ],
  exports: [
    ChatService,
    ChatModerationService,
    ChatHistoryService,
    ChatGateway,
  ],
})
export class ChatModule {}

