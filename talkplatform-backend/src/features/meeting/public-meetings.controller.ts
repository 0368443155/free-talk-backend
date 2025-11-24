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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Account } from '../../core/auth/decorators/account.decorator';
import { User } from '../../users/user.entity';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@ApiTags('Public Meetings')
@Controller('public-meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PublicMeetingsController {
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
  @ApiOperation({ summary: 'Get all public meetings' })
  @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('meeting_type') meetingType?: string,
    @Query('language') language?: string,
    @Query('level') level?: string,
    @Query('region') region?: string,
    @Query('status') status?: string,
    @Query('is_live_only') isLiveOnly?: boolean,
  ) {
    const filters = {
      meeting_type: meetingType as any,
      language,
      level: level as any,
      region,
      status: status as any,
      is_live_only: isLiveOnly,
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    return this.meetingsService.findAllPublicMeetings(paginationDto, Object.keys(filters).length > 0 ? filters : undefined);
  }

  @Get('free-talk')
  @ApiOperation({ summary: 'Get available free talk rooms' })
  @ApiResponse({ status: 200, description: 'Free talk rooms retrieved successfully' })
  async findFreeTalkRooms(
    @Query() paginationDto: PaginationDto,
    @Query('language') language?: string,
    @Query('level') level?: string,
    @Query('region') region?: string,
  ) {
    const filters = { language, level: level as any, region };
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    return this.meetingsService.findAvailableFreeTalkRooms(paginationDto, Object.keys(filters).length > 0 ? filters : undefined);
  }

  @Get('teacher-classes')
  @ApiOperation({ summary: 'Get teacher classes' })
  @ApiResponse({ status: 200, description: 'Teacher classes retrieved successfully' })
  async findTeacherClasses(
    @Query() paginationDto: PaginationDto,
    @Query('language') language?: string,
    @Query('level') level?: string,
    @Query('min_price') minPrice?: number,
    @Query('max_price') maxPrice?: number,
    @Query('scheduled_only') scheduledOnly?: boolean,
  ) {
    const filters = { 
      language, 
      level: level as any, 
      min_price: minPrice, 
      max_price: maxPrice,
      scheduled_only: scheduledOnly 
    };
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    return this.meetingsService.findTeacherClasses(paginationDto, Object.keys(filters).length > 0 ? filters : undefined);
  }

  @Get('nearby/:region')
  @ApiOperation({ summary: 'Get nearby meetings by region' })
  @ApiResponse({ status: 200, description: 'Nearby meetings retrieved successfully' })
  async findNearbyMeetings(
    @Param('region') region: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.meetingsService.findNearbyMeetings(region, paginationDto);
  }

  @Get(':meetingId')
  @ApiOperation({ summary: 'Get meeting by ID' })
  @ApiResponse({ status: 200, description: 'Meeting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async findOne(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.findOne(meetingId, user);
  }

  @Patch(':meetingId')
  @ApiOperation({ summary: 'Update meeting' })
  @ApiResponse({ status: 200, description: 'Meeting updated successfully' })
  async update(
    @Param('meetingId') meetingId: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Account() user: User,
  ) {
    return this.meetingsService.update(meetingId, updateMeetingDto, user);
  }

  @Delete(':meetingId')
  @ApiOperation({ summary: 'Delete meeting' })
  @ApiResponse({ status: 200, description: 'Meeting deleted successfully' })
  async remove(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.remove(meetingId, user);
  }

  @Post(':meetingId/start')
  @ApiOperation({ summary: 'Start meeting' })
  @ApiResponse({ status: 200, description: 'Meeting started successfully' })
  async startMeeting(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.startMeeting(meetingId, user);
  }

  @Post(':meetingId/end')
  @ApiOperation({ summary: 'End meeting' })
  @ApiResponse({ status: 200, description: 'Meeting ended successfully' })
  async endMeeting(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.endMeeting(meetingId, user);
  }

  @Post(':meetingId/join')
  @ApiOperation({ summary: 'Join meeting' })
  @ApiResponse({ status: 200, description: 'Joined meeting successfully' })
  async joinMeeting(
    @Param('meetingId') meetingId: string,
    @Account() user: User,
    @Body() body?: { audioEnabled?: boolean; videoEnabled?: boolean }
  ) {
    return this.meetingsService.joinMeeting(meetingId, user, body);
  }

  @Post(':meetingId/leave')
  @ApiOperation({ summary: 'Leave meeting' })
  @ApiResponse({ status: 200, description: 'Left meeting successfully' })
  async leaveMeeting(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.leaveMeeting(meetingId, user);
  }

  @Post(':meetingId/lock')
  @ApiOperation({ summary: 'Lock meeting' })
  @ApiResponse({ status: 200, description: 'Meeting locked successfully' })
  async lockMeeting(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.lockMeeting(meetingId, user);
  }

  @Post(':meetingId/unlock')
  @ApiOperation({ summary: 'Unlock meeting' })
  @ApiResponse({ status: 200, description: 'Meeting unlocked successfully' })
  async unlockMeeting(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.unlockMeeting(meetingId, user);
  }

  @Get(':meetingId/participants')
  @ApiOperation({ summary: 'Get meeting participants' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async getParticipants(@Param('meetingId') meetingId: string, @Account() user: User) {
    return this.meetingsService.getParticipants(meetingId, user);
  }

  @Get(':meetingId/chat')
  @ApiOperation({ summary: 'Get meeting chat messages' })
  @ApiResponse({ status: 200, description: 'Chat messages retrieved successfully' })
  async getChatMessages(
    @Param('meetingId') meetingId: string,
    @Account() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.meetingsService.getChatMessages(meetingId, user, paginationDto);
  }

  @Post(':meetingId/participants/:participantId/kick')
  @ApiOperation({ summary: 'Kick participant from meeting' })
  @ApiResponse({ status: 200, description: 'Participant kicked successfully' })
  async kickParticipant(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string,
    @Account() user: User,
  ) {
    return this.meetingsService.kickParticipant(meetingId, participantId, user);
  }

  @Post(':meetingId/participants/:participantId/block')
  @ApiOperation({ summary: 'Block participant from meeting' })
  @ApiResponse({ status: 200, description: 'Participant blocked successfully' })
  async blockParticipant(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string,
    @Account() user: User,
  ) {
    return this.meetingsService.blockParticipant(meetingId, participantId, user);
  }

  @Post(':meetingId/participants/:participantId/mute')
  @ApiOperation({ summary: 'Mute participant' })
  @ApiResponse({ status: 200, description: 'Participant muted successfully' })
  async muteParticipant(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string,
    @Account() user: User,
  ) {
    return this.meetingsService.muteParticipant(meetingId, participantId, user);
  }

  @Post(':meetingId/participants/:participantId/promote')
  @ApiOperation({ summary: 'Promote participant to moderator' })
  @ApiResponse({ status: 200, description: 'Participant promoted successfully' })
  async promoteParticipant(
    @Param('meetingId') meetingId: string,
    @Param('participantId') participantId: string,
    @Account() user: User,
  ) {
    return this.meetingsService.promoteParticipant(meetingId, participantId, user);
  }
}

