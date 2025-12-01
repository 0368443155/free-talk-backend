import { Module } from '@nestjs/common';
import { RedisCacheService } from './services/redis-cache.service';
import { RoomStateCacheService } from './services/room-state-cache.service';
import { SessionCacheService } from './services/session-cache.service';

@Module({
  providers: [
    RedisCacheService,
    RoomStateCacheService,
    SessionCacheService,
  ],
  exports: [
    RedisCacheService,
    RoomStateCacheService,
    SessionCacheService,
  ],
})
export class CacheModule {}

