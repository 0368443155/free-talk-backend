import { Module, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { TeacherProfile } from './teachers/teacher-profile.entity';
import { TeachersModule } from './teachers/teachers.module';
import { MeetingsModule } from './features/meeting/meetings.module';
import { ClassroomsModule } from './features/meeting/classrooms.module';
import { AdminModule } from './admin/admin.module';
import { MetricsModule } from './metrics/metrics.module';
import { EventsModule } from './events/events.module';
import { TasksModule } from './tasks/tasks.module';
import { APP_PIPE, APP_INTERCEPTOR, Reflector } from '@nestjs/core';

@Module({
    imports: [
        // 1. Nạp ConfigModule để đọc file .env
        ConfigModule.forRoot({
            isGlobal: true, // Giúp ConfigModule khả dụng ở mọi nơi
            envFilePath: '.env',
        }),

        // 2. Cấu hình kết nối TypeORM (MySQL)
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
                logging: configService.get<string>('NODE_ENV') === 'development', //bật log
            }),
        }),

        // 3. Cấu hình kết nối Redis
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
        
        // 4. Import các module tính năng
        AuthModule,
        UsersModule,
        TeachersModule,
        MeetingsModule,
        ClassroomsModule,
        AdminModule,
        MetricsModule,
        EventsModule,
        TasksModule,
    ],
    controllers: [AppController], // <-- THÊM MỚI
    providers: [AppService,
        // --- KÍCH HOẠT VALIDATIONPIPE TOÀN CỤC ---
        {
            provide: APP_PIPE,
            useValue: new ValidationPipe({
                whitelist: true, // Tự động loại bỏ các thuộc tính không được định nghĩa trong DTO
                forbidNonWhitelisted: true, // Ném lỗi nếu client gửi thuộc tính thừa
                transform: true, // Tự động chuyển đổi kiểu dữ liệu (vd: string query param -> number)
                transformOptions: {
                    enableImplicitConversion: true, // Cho phép chuyển đổi ngầm định (cẩn thận khi dùng)
                },
                // disableErrorMessages: true, // Ẩn thông báo lỗi chi tiết trong production
            }),
        },
        // --- KÍCH HOẠT CLASSSERIALIZERINTERCEPTOR TOÀN CỤC ---
        // Cần Reflector để hoạt động chính xác với các decorator khác (như @Exclude)
        {
            provide: APP_INTERCEPTOR,
            // Quan trọng: Phải inject Reflector vào đây
            useFactory: (reflector: Reflector) => new ClassSerializerInterceptor(reflector),
            inject: [Reflector],
        },
        // --- HẾT PHẦN KÍCH HOẠT ---
    ], // <-- THÊM MỚI
})
export class AppModule {}
/*
```

### 5. (Database) Thiết kế và chạy Migration

Bạn có hai lựa chọn ở bước này:

**Lựa chọn 1 (Đơn giản nhất - Đã có file SQL):**

Vì chúng ta đã có file `talkconnect_schema.sql` (từ cuộc trò chuyện trước), bạn có thể chạy file này trực tiếp vào CSDL `talkconnect` mà bạn đã tạo bằng một công cụ như DBeaver, DataGrip, hoặc MySQL Workbench.

**Lựa chọn 2 (Chuẩn TypeORM - Nếu bạn muốn tạo migration từ đầu):**

1.  Tạo các file entity (ví dụ: `src/users/user.entity.ts`, `src/rooms/room.entity.ts`...) dựa trên thiết kế CSDL.
2.  Cấu hình TypeORM CLI (thêm `ormconfig.ts` hoặc cấu hình trong `package.json`).
3.  Chạy lệnh: `npm run typeorm migration:generate -- -n InitialSchema`
4.  Chạy lệnh: `npm run typeorm migration:run`

**Khuyến nghị cho Tuần 1:** Sử dụng **Lựa chọn 1** để nhanh chóng có CSDL và tiếp tục các bước tiếp theo.*/
