import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { RedisIoAdapter } from './core/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
    bodyParser: false, // Disable default body parser to configure manually
  });

  // Configure Redis IoAdapter for Socket.io (enables horizontal scaling)
  const configService = app.get(ConfigService);
  const redisAdapter = new RedisIoAdapter(app, configService);
  
  try {
    await redisAdapter.connectToRedis();
    app.useWebSocketAdapter(redisAdapter);
    console.log('✅ Redis IoAdapter configured for Socket.io - Ready for horizontal scaling');
  } catch (error: any) {
    console.error('❌ Failed to connect to Redis, Socket.io will use in-memory adapter:', error.message);
    console.warn('⚠️  Warning: Without Redis, multiple NestJS instances cannot share socket connections');
    console.warn('💡 To fix: Make sure Redis is running (docker-compose up -d redis)');
  }

  // Configure body parser with increased limits for file uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global validation pipe (đã được cấu hình trong AppModule nhưng có thể override ở đây)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Tự động loại bỏ các thuộc tính không có trong DTO
    transform: true, // Tự động chuyển đổi payload thành DTO instance 
    forbidNonWhitelisted: true, // Ném lỗi nếu có thuộc tính không được định nghĩa
  }));

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3051'], // Frontend URLs
    credentials: true,
  });

  const port = configService.get<number>('PORT', 3000);

  // Set global prefix but exclude webhooks (for LiveKit Cloud to call directly)
  // Exclude all routes starting with 'webhooks/' to allow direct access
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'webhooks/livekit',
      'webhooks/livekit/events',
      'webhooks/livekit/stats',
    ],
  });

  await app.listen(port);
  console.log(`🚀 TalkPlatform Backend is running on: http://localhost:${port}`);
  console.log(`📊 Admin Dashboard: http://localhost:3001/admin`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhooks/livekit`);
}
bootstrap();