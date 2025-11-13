import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsNumber, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer'; // Cần để transform string query params

export class GetTeachersQueryDto {
    @IsOptional()
    @Type(() => Number) // Chuyển đổi string '1' thành number 1
    @IsInt()
    @Min(1)
    page?: number = 1; // Giá trị mặc định

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100) // Giới hạn tối đa
    limit?: number = 20;

    @IsOptional()
    @IsString()
    search?: string;

    // @IsOptional()
    // @IsArray() // Cách xử lý array query param phức tạp hơn, tạm bỏ qua
    // languages?: string[];

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(5)
    minRating?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxRate?: number;

    @IsOptional()
    @IsIn(['rating', 'rate', 'hours', 'newest'])
    sortBy?: 'rating' | 'rate' | 'hours' | 'newest' = 'rating'; // Mặc định sort theo rating

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc' = 'desc'; // Mặc định giảm dần

    @IsOptional()
    @IsBooleanString() // Query param thường là string 'true'/'false'
    isVerified?: string = 'true'; // Mặc định chỉ lấy teacher đã verified
}