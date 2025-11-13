import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Account } from '../../core/auth/decorators/account.decorator';
import { User } from '../../users/user.entity';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@ApiTags('Meetings')
@Controller('meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeetingsGeneralController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new public meeting' })
  @ApiResponse({ status: 201, description: 'Meeting created successfully' })
  async create(
    @Body() createMeetingDto: CreateMeetingDto,
    @Account() user: User,
  ) {
    return this.meetingsService.createPublicMeeting(createMeetingDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all meetings' })
  @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
  async findAll(@Account() user: User, @Query() paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    return this.meetingsService.findAllPublicMeetings({ page, limit });
  }

  @Get(':meetingId')
  @ApiOperation({ summary: 'Get meeting by ID' })
  @ApiResponse({ status: 200, description: 'Meeting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async findOne(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.findOne(meetingId, user);
  }
}