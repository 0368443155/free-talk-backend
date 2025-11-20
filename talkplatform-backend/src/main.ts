import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Set global prefix but exclude webhooks (for LiveKit Cloud to call directly)
  app.setGlobalPrefix('api/v1', {
    exclude: ['webhooks/livekit'],
  });

  await app.listen(port);
  console.log(`🚀 TalkPlatform Backend is running on: http://localhost:${port}`);
  console.log(`📊 Admin Dashboard: http://localhost:3001/admin`);
  console.log(`🔗 Webhook endpoint: http://localhost:${port}/webhooks/livekit`);
}
bootstrap();