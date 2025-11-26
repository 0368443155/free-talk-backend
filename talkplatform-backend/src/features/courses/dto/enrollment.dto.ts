import { IsNotEmpty, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { EnrollmentType } from '../entities/enrollment.entity';

export class EnrollCourseDto {
    @IsNotEmpty()
    @IsEnum(EnrollmentType)
    enrollment_type: EnrollmentType;
}

export class PurchaseSessionDto {
    @IsNotEmpty()
    session_id: string;
}

export class CancelEnrollmentDto {
    @IsOptional()
    reason?: string;
}

export class CancelSessionPurchaseDto {
    @IsOptional()
    reason?: string;
}

export class EnrollmentResponseDto {
    id: string;
    user_id: string;
    course_id: string;
    enrollment_type: EnrollmentType;
    total_price_paid: number;
    payment_status: string;
    status: string;
    enrolled_at: Date;
    completion_percentage: number;
    course?: {
        id: string;
        title: string;
        teacher_id: string;
        total_sessions: number;
    };
}

export class SessionPurchaseResponseDto {
    id: string;
    user_id: string;
    course_id: string;
    session_id: string;
    price_paid: number;
    payment_status: string;
    status: string;
    purchased_at: Date;
    attended: boolean;
    attendance_duration_minutes: number;
    session?: {
        id: string;
        title: string;
        session_number: number;
        scheduled_date: Date;
        start_time: string;
        end_time: string;
    };
}
