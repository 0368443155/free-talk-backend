// src/features/meeting/classrooms.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Account } from '../../core/auth/decorators/account.decorator';
import { User } from '../../users/user.entity';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@ApiTags('Classrooms')
@Controller('classrooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new classroom' })
  async create(
    @Body() createClassroomDto: CreateClassroomDto,
    @Account() user: User,
  ) {
    return this.classroomsService.create(createClassroomDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all classrooms' })
  async findAll(@Account() user: User, @Query() paginationDto: PaginationDto) {
    return this.classroomsService.findAll(user, paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get classroom by ID' })
  async findOne(@Param('id') id: string, @Account() user: User) {
    return this.classroomsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update classroom' })
  async update(
    @Param('id') id: string,
    @Body() updateClassroomDto: UpdateClassroomDto,
    @Account() user: User,
  ) {
    return this.classroomsService.update(id, updateClassroomDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete classroom' })
  async remove(@Param('id') id: string, @Account() user: User) {
    return this.classroomsService.remove(id, user);
  }

  // ==================== CLASSROOM MEETINGS ====================

  @Post(':id/meetings')
  @ApiOperation({ summary: 'Create a meeting in classroom (teachers only)' })
  async createMeeting(
    @Param('id') classroomId: string,
    @Body() createMeetingDto: CreateMeetingDto,
    @Account() user: User,
  ) {
    return this.classroomsService.createClassroomMeeting(classroomId, createMeetingDto, user);
  }

  @Get(':id/meetings')
  @ApiOperation({ summary: 'Get all meetings in classroom' })
  async getMeetings(
    @Param('id') classroomId: string,
    @Account() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.classroomsService.getClassroomMeetings(classroomId, user, paginationDto);
  }

  @Get(':id/meetings/:meetingId')
  @ApiOperation({ summary: 'Get a specific meeting in classroom' })
  async getMeeting(
    @Param('id') classroomId: string,
    @Param('meetingId') meetingId: string,
    @Account() user: User,
  ) {
    return this.classroomsService.getClassroomMeeting(classroomId, meetingId, user);
  }
}