import { IsString, IsNotEmpty } from 'class-validator';

export class ReactToMessageDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  reaction: string;
}

