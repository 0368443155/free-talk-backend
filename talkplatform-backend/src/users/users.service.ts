// // src/users/users.service.ts

import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto'; 
import { CreateStudentDto } from '../auth/dto/create-student.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    // 1. create new student
    async createStudent(createStudentDto: CreateStudentDto): Promise<User> {
        const { email, username, password } = createStudentDto;
        
        //check existed email
        const existingUser = await this.findByEmail(email);
        if(existingUser) {
            throw new ConflictException('Email already exists');
        }

        const user = this.usersRepository.create({
            email,
            username,
            password, //sẽ được hash
            role: UserRole.STUDENT, //role mặcđịnh
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
