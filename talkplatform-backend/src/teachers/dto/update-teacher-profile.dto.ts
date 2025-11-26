import { IsOptional, IsString, MaxLength, IsUrl, IsNumber, Min, IsArray } from 'class-validator';

export class UpdateTeacherProfileDto{
    @IsOptional()
    @IsString()
    @MaxLength(100, {message: 'Headline cant be longer than 100 characters'})
    headline?:string;

    @IsOptional()
    @IsString()
    @MaxLength(100, {message: 'Headline cant be longer than 100 characters'})
    bio?:string;

    @IsOptional()
    @IsUrl({}, { message: 'Intro video must be a valid URL (YouTube/Vimeo)' })
    introVideoUrl?:string;

    @IsOptional()
    @IsNumber({}, {message: 'Hourly rate must be a number'})
    @Min(1, {message: 'Hourly rate must be at least 1 credit'})
    hourlyRate?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    languagesTaught?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specialties?: string[];

    @IsOptional()
    @IsString()
    country?: string;
}