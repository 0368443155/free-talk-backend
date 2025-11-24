import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalChatService } from './global-chat.service';
import { GlobalChatController } from './global-chat.controller';
import { GlobalChatGateway } from './global-chat.gateway';
import { GlobalChatMessage } from './entities/global-chat-message.entity';
import { User } from '../../users/user.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalChatMessage, User]),
    JwtModule.register({}),
  ],
  controllers: [GlobalChatController],
  providers: [GlobalChatService, GlobalChatGateway],
  exports: [GlobalChatService],
})
export class GlobalChatModule {}

