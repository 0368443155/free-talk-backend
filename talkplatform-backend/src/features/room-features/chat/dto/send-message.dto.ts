import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { MessageType } from '../../../meeting/entities/meeting-chat-message.entity';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @IsString()
  @IsOptional()
  replyTo?: string;

  @IsString()
  @IsOptional()
  type?: MessageType;
}

