// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from "src/users/dto/create-user.dto";
import { CreateStudentDto } from "./dto/create-student.dto";
import { User } from "src/users/user.entity";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService{
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ){}

    //1. đăng kí
    async registerStudent(createStudentDto: CreateStudentDto): Promise<{accessToken: string, user: Partial<User>}>{
        //kiểm tra email tồn tại
        //gọi hàm createStudent từ UsersService
        let user: User;
        try{
            user = await this.usersService.createStudent(createStudentDto);
            //sau khi save thành công, user obj sẽ có id và các giá tị default
        } catch (error){
            // Bắt lỗi ConflictException từ UsersService
            if (error instanceof ConflictException) {
                throw new ConflictException(error.message); // Re-throw lỗi cụ thể
            }
            console.error("Error during user creation:", error); // Log lỗi chi tiết
            throw new InternalServerErrorException('An unexpected error occurred during registration.');
        }
        //tạo payload cho jwt
        const payload = {
            sub: user.id, //subj UID - convention chuẩn cho jwt
            username: user.username, //thêm username để hiển thị nhanh ở client
            role: user.role, //thêm role 
        }
        //tạo access token
        const accessToken= this.jwtService.sign(payload);
        //chuẩn bị dữ liệu trả về
        const {password, ... userResult } = user;

        return { accessToken, user: userResult};
    }

    //2. Đăng nhập (tạo jwt)
    async login(loginDto: LoginDto): Promise<{accessToken: string, user: Partial<User>}> {
        const {email, password: plainPassword } = loginDto;

        //tìm user bằng email
        const user = await this.usersService.findByEmail(email);

        // Nếu không tìm thấy user hoặc password không khớp
        if (!user || !user.password || !(await bcrypt.compare(plainPassword, user.password))) {
            throw new UnauthorizedException('Invalid email or password'); // Thông báo chung chung để bảo mật
        }

        const payload = { username: user.username, sub: user.id, role: user.role};
        // Tạo access token
        const accessToken = this.jwtService.sign(payload);

        // Trả về token và thông tin user (loại bỏ password)
        const { password, ...userResult } = user;

        return { accessToken, user: userResult };
    }

    //3. validate user
    async validateUserById(userId: string): Promise<User | null>{
        return this.usersService.findById(userId);
    }

    //4. Generate JWT token
    generateToken(payload: any): string {
        return this.jwtService.sign(payload);
    }
}