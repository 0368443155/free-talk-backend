// src/users/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
   
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, { message: 'Password phải dài ít nhất 6 ký tự' })
    password: string;
}