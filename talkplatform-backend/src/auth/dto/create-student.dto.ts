import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches, IsOptional } from "class-validator";

export class CreateStudentDto {
    @IsNotEmpty({ message: 'Email is required'})
    @IsEmail({}, {message: 'Email must be a valid email address'})
    email:string;

    @IsNotEmpty({message: 'Username is required'})
    @IsString({message: 'Username must be a string'})
    @MinLength(3, {message: 'Username must be at least 3 characters long'})
    @MaxLength(50, {message: 'Username can not be longer than 50 characters'})
    @Matches(/^[a-zA-Z0-9]+$/, {message: 'Username can only contain alphanumeric characters and underscores'})
    username: string;

    @IsNotEmpty({message: 'Password is required'})
    @IsString({message: 'Password must be a string'})
    //Regex: UP, low, num, spe
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {message: 'Password must contain at least 1 UP,low letter and one number'})
    password:string;

    //validate cho confirm Password ở tầng service hoặc controller
    //confirmPassword: string;

    @IsOptional()
    @IsString()
    @MaxLength(8, {message: 'Referal code cannot be longer than 8 characters'})
    referralCode?: string;

    // Nên có trường chấp nhận điều khoản
    // @IsNotEmpty({ message: 'You must accept the terms and conditions' })
    // @Equals(true, { message: 'You must accept the terms and conditions' }) // Đảm bảo là true
    // acceptTerms: boolean;
}