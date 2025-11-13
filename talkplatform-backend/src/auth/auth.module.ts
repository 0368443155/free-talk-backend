import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'; // Thêm JwtModuleOptions
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy'; // Import JwtStrategy sẽ tạo ở bước sau

@Module({
  imports: [
    UsersModule, // Cần UsersService để tìm/tạo user
    PassportModule.register({ defaultStrategy: 'jwt' }), // Đăng ký Passport với strategy mặc định là jwt
    JwtModule.registerAsync({
      imports: [ConfigModule], // Cần ConfigModule để đọc JWT_SECRET từ .env
      inject: [ConfigService],
      // --- SỬA LẠI useFactory (Thêm kiểu trả về JwtModuleOptions) ---
      useFactory: (configService: ConfigService): JwtModuleOptions => { // Chỉ rõ kiểu trả về
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        const expiresInString = configService.getOrThrow<string>('JWT_EXPIRATION_TIME');
        let expiresIn: number | string;
        if (/^\d+$/.test(expiresInString)) {
          // Chỉ số, không có đơn vị → parse thành số
          expiresIn = parseInt(expiresInString, 10);
        } else {
          // Có đơn vị (7d, 24h, etc.) → giữ nguyên string
          expiresIn = expiresInString;
        }
        return {
            secret: secret,
            signOptions: {
                expiresIn: expiresIn as any,
            },
        };
      },
      // --- HẾT PHẦN SỬA ---
    }),
    ConfigModule, // Đảm bảo ConfigModule được import
  ],
  providers: [AuthService, JwtStrategy], // Thêm JwtStrategy vào providers
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule], // Export để các module khác có thể dùng Guard
})
export class AuthModule {}