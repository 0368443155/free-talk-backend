import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis'; // Use redis client (not ioredis) for Socket.IO adapter
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis IoAdapter for Socket.IO
 * Enables scaling Socket.IO across multiple NestJS instances
 * Messages published on one instance will be broadcast to all other instances via Redis
 */
@Injectable()
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: any,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '');
    const redisDb = this.configService.get<number>('REDIS_DB', 0);

    // Create Redis pub/sub clients using redis client (required by @socket.io/redis-adapter)
    const pubClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword || undefined,
      database: redisDb,
    });

    const subClient = pubClient.duplicate();

    // Handle connection events
    pubClient.on('connect', () => {
      this.logger.log(`✅ Redis Pub Client connected to ${redisHost}:${redisPort}`);
    });

    subClient.on('connect', () => {
      this.logger.log(`✅ Redis Sub Client connected to ${redisHost}:${redisPort}`);
    });

    pubClient.on('error', (err) => {
      this.logger.error('Redis Pub Client Error:', err);
    });

    subClient.on('error', (err) => {
      this.logger.error('Redis Sub Client Error:', err);
    });

    // Connect to Redis
    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.logger.log(`✅ Connected to Redis at ${redisHost}:${redisPort}`);

    // Create Socket.IO Redis adapter
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('✅ Redis IoAdapter created successfully');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    // Extract origin from cors options (handle both object and function types)
    let corsOrigin: string | string[] = ['http://localhost:3000', 'http://localhost:3001'];
    if (options?.cors) {
      if (typeof options.cors === 'object' && 'origin' in options.cors) {
        corsOrigin = options.cors.origin as string | string[];
      }
    }

    const server = super.createIOServer(port, {
      ...options,
      // Enable CORS for Socket.IO
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
    });

    // Use Redis adapter if available
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.logger.log('✅ Socket.IO server configured with Redis adapter');
    } else {
      this.logger.warn('⚠️ Redis adapter not available, using default in-memory adapter');
    }

    return server;
  }
}
