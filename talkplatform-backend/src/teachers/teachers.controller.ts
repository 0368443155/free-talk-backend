import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors, Patch, Param, Req,Body, UseGuards, Post } from '@nestjs/common';
import { User } from 'src/users/user.entity';
import { TeachersService } from './teachers.service';
import { GetTeachersQueryDto } from './dto/get-teachers-query-dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';

interface RequestWithUser extends Request {
    user: User;
}

@Controller('teachers')
@UseInterceptors(ClassSerializerInterceptor) //ẩn các lớp có trường Exclude
export class TeachersController {
    constructor (private readonly teachersService: TeachersService){}

    //lấy danh sách
    //get /teachers?page=1&limit=10&sortBy=rating
    @Get()
    async getTeachers(@Query() queryDto: GetTeachersQueryDto){
        try {
            const {teachers, total} = await this.teachersService.getTeachers(queryDto);
            const limit = Number(queryDto.limit) || 20;
            const page = Number(queryDto.page) || 1;
            return {
                data: teachers,
                pagination: {
                    currentPage: page,
                    itemsPage: limit,
                    totalItems: total,
                    totalPages: Math.ceil(total / limit),
                }
            };
        } catch (error) {
            console.error('Error in getTeachers controller:', error);
            throw error;
        }
    }

    // --- API Cập nhật Profile Teacher (Yêu cầu login Teacher) ---
    // PATCH /teachers/me/profile
    @Patch('me/profile') // Sử dụng 'me' để chỉ người dùng hiện tại
    @UseGuards(JwtAuthGuard) // Yêu cầu phải đăng nhập
    // @Roles('teacher') // Chỉ cho phép role 'teacher' (sẽ tạo RolesGuard)
    // @UseGuards(JwtAuthGuard, RolesGuard) // Kết hợp 2 Guards
    async updateMyProfile(
        @Req() req: RequestWithUser, // Lấy user từ request (đã được JwtStrategy gán vào)
        @Body() updateDto: UpdateTeacherProfileDto,
    ) {
        const userId = req.user.id; // Lấy ID của user đang đăng nhập
        return this.teachersService.updateTeacherProfile(userId, updateDto);
    }

    // POST /teachers/me/become-teacher
    @Post('me/become-teacher')
    @UseGuards(JwtAuthGuard)
    async becomeTeacher(@Req() req: RequestWithUser) {
        const userId = (req as any).user.id;
        return this.teachersService.becomeTeacher(userId);
    }

    // GET /teachers/me/profile
    @Get('me/profile')
    @UseGuards(JwtAuthGuard)
    async getMyProfile(@Req() req: RequestWithUser) {
        const userId = (req as any).user.id;
        return this.teachersService.getProfileByUserId(userId);
    }

    // GET /teachers/:id - Must be after /me routes to avoid route conflicts
    @Get(':id')
    async getTeacherById(@Param('id') id: string) {
        console.log(`[TeachersController] getTeacherById called with id: ${id}`);
        try {
            // Validate UUID nếu cần
            // if (!isValidUUID(id)) throw new BadRequestException('Invalid teacher ID format');
            const result = await this.teachersService.getTeacherById(id);
            console.log(`[TeachersController] Successfully retrieved teacher with id: ${id}`);
            return result;
        } catch (error) {
            console.error(`[TeachersController] Error getting teacher by id ${id}:`, error);
            throw error;
        }
        // Lưu ý: Service sẽ throw NotFoundException nếu không tìm thấy
    }

    // (Sau này có thể thêm API đăng ký Teacher ở đây POST /teachers/register hoặc để trong AuthController)
}
