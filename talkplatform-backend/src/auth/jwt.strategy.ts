// // src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';

//interface định nghĩa payload giải mã từ jwt
interface JwtPayload {
    sub: string,
    username: string,
    role: string,
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService, // Thêm UsersService
        private authService: AuthService,
    ) {
        // SỬA: Lấy jwtSecret ra trước để kiểm tra 'undefined'
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
            throw new Error('JWT_SECRET không được định nghĩa trong file .env!');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret, // Truyền secret đã kiểm tra vào đây
        });
    }

    /**
     * Hàm này được Passport tự động gọi sau khi giải mã token thành công
     * Payload chính là { username: user.username, sub: user.id }
     */
    async validate(payload: { sub: string; username: string }) {
        console.log('JWT Payload: ', payload);
        // Lấy user từ CSDL bằng ID (lưu trong 'sub' của token)
        const user = await this.authService.validateUserById(payload.sub);

        if (!user) {
            throw new UnauthorizedException('User not found or token invalid');
        }
        
        // Quan trọng: Đối tượng trả về từ hàm validate sẽ được Passport
        // tự động gán vào request.user (ví dụ: req.user trong Controller)
        // Chỉ trả về user entity, không cần trả về password hash
        return user;
    }
}
