import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { GlobalChatService } from './global-chat.service';
import { GlobalChatController } from './global-chat.controller';
import { GlobalChatGateway } from './global-chat.gateway';
import { GlobalChatRedisService } from './services/global-chat-redis.service';
import { GlobalChatMessage } from './entities/global-chat-message.entity';
import { User } from '../../users/user.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalChatMessage, User]),
    ScheduleModule.forRoot(),
    RedisModule, // Import RedisModule for Redis service
    JwtModule.register({}),
  ],
  controllers: [GlobalChatController],
  providers: [GlobalChatService, GlobalChatGateway, GlobalChatRedisService],
  exports: [GlobalChatService, GlobalChatRedisService],
})
export class GlobalChatModule {}

