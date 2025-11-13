// src/features/meeting/dto/update-classroom.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateClassroomDto } from './create-classroom.dto';

export class UpdateClassroomDto extends PartialType(CreateClassroomDto) {}