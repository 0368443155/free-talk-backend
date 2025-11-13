import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    //lấy configservice đọc port từ .env
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    // Kích hoạt CORS (cho phép frontend gọi)
    app.enableCors({
        origin: true, //cho phép mọi origin (thay đổi khi deploy)
        credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });
    
    app.setGlobalPrefix('api/v1');

    // ValidationPipe và ClassSerializerInterceptor đã được kích hoạt global trong AppModule
    // thông qua APP_PIPE và APP_INTERCEPTOR, không cần gọi lại ở đây.
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();