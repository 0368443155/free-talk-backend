import { Module, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TeachersModule } from './teachers/teachers.module';
import { MeetingsModule } from './features/meeting/meetings.module';
import { ClassroomsModule } from './features/meeting/classrooms.module';
import { AdminModule } from './admin/admin.module';
import { MetricsModule } from './metrics/metrics.module';
import { EventsModule } from './events/events.module';
import { TasksModule } from './tasks/tasks.module';
import { LiveKitModule } from './livekit/livekit.module';
import { MarketplaceModule } from './features/marketplace/marketplace.module';
import { CoursesModule } from './features/courses/courses.module';
import { APP_PIPE, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { DebugController } from './debug/debug.controller';
import { DebugPublicController } from './debug/debug-public.controller';
import { TypeOrmModule as DebugTypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Serve static files from 'uploads' directory
        // Note: This will serve files from /uploads/* URLs
        // Use process.cwd() to get the project root directory (works in both dev and production)
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
            serveStaticOptions: {
                index: false, // Disable directory listing
                setHeaders: (res, path) => {
                    // Set cache headers for better performance
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                },
            },
        }),

        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'mysql',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_DATABASE'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false,
                autoLoadEntities: true,
                logging: configService.get<string>('NODE_ENV') === 'development',
            }),
        }),

        RedisModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'single',
                options: {
                    host: configService.get<string>('REDIS_HOST'),
                    port: configService.get<number>('REDIS_PORT'),
                    password: configService.get<string>('REDIS_PASSWORD'),
                    db: configService.get<number>('REDIS_DB') || 0,
                },
            }),
        }),

        AuthModule,
        UsersModule,
        TeachersModule,
        MeetingsModule,
        ClassroomsModule,
        AdminModule,
        MetricsModule,
        EventsModule,
        TasksModule,
        LiveKitModule,
        MarketplaceModule,
        CoursesModule, // ✅ Added Courses Module

        require('./features/livekit-rooms/livekit-rooms.module').LiveKitRoomsModule,
        require('./features/credits/credits.module').CreditsModule,
        require('./features/wallet/wallet.module').WalletModule,
        require('./features/teachers/enhanced-teachers.module').EnhancedTeachersModule,
        require('./features/teachers/teacher-verification.module').TeacherVerificationModule,
        require('./core/storage/storage.module').StorageModule,
        require('./features/booking/booking.module').BookingModule,
        require('./features/global-chat/global-chat.module').GlobalChatModule,

        DebugTypeOrmModule.forFeature([
            require('./features/meeting/entities/meeting.entity').Meeting,
            require('./metrics/livekit-metric.entity').LiveKitMetric
        ]),
    ],
    controllers: [AppController, DebugController, DebugPublicController],
    providers: [AppService,
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
                transformOptions: {
                    enableImplicitConversion: true,
                },
            }),
        },
        {
            provide: APP_INTERCEPTOR,
            useFactory: (reflector: Reflector) => new ClassSerializerInterceptor(reflector),
            inject: [Reflector],
        },
    ],
})
export class AppModule { }
