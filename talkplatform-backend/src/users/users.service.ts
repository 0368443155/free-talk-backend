// // src/users/users.service.ts

import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto'; 
import { CreateStudentDto } from '../auth/dto/create-student.dto';

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
                where: { affiliate_code: referralCode }
            });
            
            // Optional: Log warning if invalid code, but don't block registration
            if (!referrer) {
                this.logger.warn(`Invalid affiliate code used during registration: ${referralCode}`);
            }
        }

        // Generate affiliate code for new user
        const affiliateCode = await this.generateUniqueAffiliateCode(username);

        const user = this.usersRepository.create({
            email,
            username,
            password, //sẽ được hash
            role: UserRole.STUDENT, //role mặc định
            affiliate_code: affiliateCode,
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
}
