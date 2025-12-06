// // src/users/users.service.ts

import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto'; 
import { CreateStudentDto } from '../auth/dto/create-student.dto';
import { TeacherProfile, TeacherStatus } from '../features/teachers/entities/teacher-profile.entity';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    // 1. create new student
    async createStudent(createStudentDto: CreateStudentDto): Promise<User> {
        const { email, username, password, referralCode } = createStudentDto;
        
        //check existed email
        const existingUser = await this.findByEmail(email);
        if(existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Handle referral code (affiliate tracking)
        let referrer: User | null = null;
        if (referralCode) {
            referrer = await this.usersRepository.findOne({
                where: { affiliate_code: referralCode },
                relations: ['teacherProfile'],
            });
            
            // Validate referrer:
            // 1. Tồn tại
            // 2. Là giáo viên (role = TEACHER)
            // 3. Teacher profile đã được verify
            if (!referrer) {
                throw new BadRequestException('Invalid referral code');
            }
            
            if (referrer.role !== UserRole.TEACHER) {
                throw new BadRequestException('Referral code is not from a verified teacher');
            }
            
            if (!referrer.teacherProfile || referrer.teacherProfile.status !== TeacherStatus.APPROVED) {
                throw new BadRequestException('Referral code is not from a verified teacher');
            }
        }

        // KHÔNG tạo affiliate_code cho student
        // affiliate_code chỉ được tạo khi teacher được verified

        const user = this.usersRepository.create({
            email,
            username,
            password, //sẽ được hash
            role: UserRole.STUDENT, //role mặc định
            // KHÔNG set affiliate_code ở đây
            // affiliate_code: null (default)
            referrer_id: referrer ? referrer.id : undefined,
        });

        //dùng @BeforeInsert tự động hash Password
        try {
            await this.usersRepository.save(user);
            // Không trả về password hash trong response (mặc dù đã hash trong DB)
            // Interceptor sẽ xử lý việc loại bỏ password khỏi JSON response cuối cùng
            return user;
        } catch (error) {
            // Xử lý các lỗi CSDL khác nếu cần
            // Ví dụ: Lỗi unique constraint nếu email bị trùng (dù đã check)
             if (error.code === 'ER_DUP_ENTRY') { // Mã lỗi MySQL cho duplicate entry
                 throw new ConflictException('Email already exists');
             }
            console.error("Error saving user:", error); // Log lỗi chi tiết
            throw new InternalServerErrorException('Error registering user'); // Lỗi không xác định
        }
    }

    // Helper to generate unique affiliate code
    private async generateUniqueAffiliateCode(username: string): Promise<string> {
        // Remove special chars, take first 5 chars, uppercase + random 3 numbers
        const prefix = username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
        let code: string;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        // Keep generating until we get a unique code
        while (!isUnique && attempts < maxAttempts) {
            const suffix = Math.floor(100 + Math.random() * 900); // 3 digit random (100-999)
            code = `${prefix}${suffix}`;
            
            const existing = await this.usersRepository.findOne({
                where: { affiliate_code: code }
            });
            
            if (!existing) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique) {
            // Fallback: use timestamp if can't generate unique code
            const timestamp = Date.now().toString().slice(-6);
            code = `${prefix}${timestamp}`;
        }

        return code!;
    }

    // 2. Dùng khi đăng nhập và validate (AuthService)
    // SỬA: TypeORM trả về 'null', không phải 'undefined'
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ email });
    }

    // 3. Dùng cho JWT Strategy (lấy user từ payload)
    // SỬA: TypeORM trả về 'null', không phải 'undefined'
    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ id });
    }

    // 4. Find user by Clerk ID
    async findByClerkId(clerkId: string): Promise<User | null> {
        return this.usersRepository.findOneBy({ clerkId });
    }

    // 5. Update user
    async update(id: string, updateData: Partial<User>): Promise<User> {
        await this.usersRepository.update(id, updateData);
        const user = await this.findById(id);
        if (!user) {
            throw new InternalServerErrorException('User not found after update');
        }
        return user;
    }

    // 6. Create user from OAuth (without password)
    async createOAuthUser(oauthData: { email: string; username: string; name: string; avatar_url?: string; clerkId: string; role: UserRole }): Promise<User> {
        const { email, username, clerkId, avatar_url, role } = oauthData;

        // Check if email exists
        const existingUser = await this.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const user = this.usersRepository.create({
            email,
            username,
            clerkId,
            avatar_url: avatar_url,
            role: role || UserRole.STUDENT,
            password: null, // OAuth users don't have passwords
        });

        try {
            await this.usersRepository.save(user);
            return user;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new ConflictException('Email already exists');
            }
            console.error("Error saving OAuth user:", error);
            throw new InternalServerErrorException('Error creating OAuth user');
        }
    }

    /**
     * Generate affiliate code for teacher (only when verified)
     */
    async generateAffiliateCodeForTeacher(teacherId: string): Promise<string> {
        const teacher = await this.usersRepository.findOne({
            where: { id: teacherId },
            relations: ['teacherProfile'],
        });

        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        if (teacher.role !== UserRole.TEACHER) {
            throw new BadRequestException('User is not a teacher');
        }

        // Check if teacher is verified (using TeacherStatus enum)
        if (!teacher.teacherProfile || teacher.teacherProfile.status !== TeacherStatus.APPROVED) {
            throw new BadRequestException('Teacher is not verified');
        }

        // Nếu đã có affiliate_code, return existing
        if (teacher.affiliate_code) {
            return teacher.affiliate_code;
        }

        // Generate unique affiliate code
        const affiliateCode = await this.generateUniqueAffiliateCode(
            teacher.username || teacher.email
        );

        teacher.affiliate_code = affiliateCode;
        await this.usersRepository.save(teacher);

        this.logger.log(`✅ Generated affiliate code for teacher ${teacherId}: ${affiliateCode}`);
        return affiliateCode;
    }
}
