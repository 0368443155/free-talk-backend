import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Email must be a valid email address' })
    @IsNotEmpty({ message: 'Email should not be empty' })
    email: string;

    @IsString({ message: 'Password should not be empty' })
    @IsNotEmpty({ message: 'Password must be a string' })
    password: string;
}
