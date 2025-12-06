import { Controller, Post, Body, UseInterceptors, ClassSerializerInterceptor, HttpCode, HttpStatus, UnauthorizedException, UsePipes, ValidationPipe, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { LoginDto } from './dto/login.dto'; // Sẽ tạo file này
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { Account } from '../core/auth/decorators/account.decorator';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';

// Dùng ClassSerializerInterceptor để kích hoạt @Exclude() trong User Entity
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService
    ) {}
    //Post auth/register
    @Post('register')
    async register(@Body() createStudentDto: CreateStudentDto) {
        // (Trong dự án thực tế, bạn nên dùng try-catch để bắt lỗi email trùng lặp)
        // Có thể thêm logic kiểm tra confirmPassword ở đây nếu DTO có thêm trường đó
        // if (createStudentDto.password !== createStudentDto.confirmPassword) {
        //   throw new BadRequestException('Passwords do not match');
        // }
        const user = await this.authService.registerStudent(createStudentDto);
        return user; // Tự động ẩn password nhờ @Exclude() và ClassSerializerInterceptor
    }

    //login
    @Post('login')
    @HttpCode(HttpStatus.OK) // Mặc định POST là 201, đổi thành 200
    ///@UsePipes(ValidationPipe)
    async login(@Body() loginDto: LoginDto) {
        // const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        // if (!user) {
        //     throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
        // }
        return this.authService.login(loginDto); // Trả về access_token và user
    }

    // Get current user info
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Account() user: User) {
        return user;
    }

    // Logout
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout() {
        // In a real application, you might want to invalidate the token
        // For now, just return success
        return { message: 'Logged out successfully' };
    }

    // OAuth callback for Clerk/Google login
    @Post('oauth/callback')
    @HttpCode(HttpStatus.OK)
    async oauthCallback(@Body() body: { clerkId: string; email: string; name: string; avatar?: string }) {
        try {
            // Check if user exists by clerkId
            let user = await this.usersService.findByClerkId(body.clerkId);

            if (!user) {
                // Try to find by email
                user = await this.usersService.findByEmail(body.email);

                if (user) {
                    // Update existing user with clerkId
                    await this.usersService.update(user.id, { clerkId: body.clerkId });
                } else {
                    // Create new user from OAuth data
                    user = await this.usersService.createOAuthUser({
                        email: body.email,
                        username: body.email.split('@')[0], // Use email prefix as username
                        name: body.name,
                        avatar_url: body.avatar,
                        clerkId: body.clerkId,
                        role: UserRole.STUDENT,
                    });
                }
            }

            // Generate JWT token
            const payload = {
                sub: user.id,
                username: user.username,
                role: user.role,
            };
            const accessToken = this.authService.generateToken(payload);

            const { password, ...userResult } = user;
            return { accessToken, user: userResult };
        } catch (error) {
            console.error('OAuth callback error:', error);
            throw new UnauthorizedException('OAuth authentication failed');
        }
    }
}