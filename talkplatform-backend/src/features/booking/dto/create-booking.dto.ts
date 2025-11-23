import { IsNotEmpty, IsUUID, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsUUID()
  slot_id: string; // BookingSlot ID

  @IsOptional()
  @IsString()
  student_notes?: string; // Ghi chú từ học viên
}

export class CancelBookingDto {
  @IsNotEmpty()
  @IsString()
  cancellation_reason: string;
}


