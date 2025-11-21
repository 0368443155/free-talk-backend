import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CreateLiveKitRoomDto, JoinLiveKitRoomDto } from './dto/livekit-room.dto';
import { LiveKitRoomsService } from './livekit-rooms.service';
import { PaginationDto } from '../../core/common/dto/pagination.dto';
import { MeetingType, MeetingLevel } from '../meeting/entities/meeting.entity';

@ApiTags('LiveKit Rooms')
@Controller('livekit/rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class LiveKitRoomsController {
  private readonly logger = new Logger(LiveKitRoomsController.name);

  constructor(private readonly liveKitRoomsService: LiveKitRoomsService) {}

  @Post('free-talk')
  @ApiOperation({ summary: 'Create a free talk room (max 4 people, audio-first)' })
  @ApiResponse({ status: 201, description: 'Free talk room created successfully' })
  async createFreeTalkRoom(
    @Body() createRoomDto: CreateLiveKitRoomDto,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.createFreeTalkRoom(createRoomDto, req.user);
  }

  @Post('teacher-class')
  @ApiOperation({ summary: 'Create a teacher class (unlimited participants, scheduled)' })
  @ApiResponse({ status: 201, description: 'Teacher class created successfully' })
  async createTeacherClass(
    @Body() createRoomDto: CreateLiveKitRoomDto,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.createTeacherClass(createRoomDto, req.user);
  }

  @Get('discover/free-talk')
  @ApiOperation({ summary: 'Discover available free talk rooms' })
  @ApiResponse({ status: 200, description: 'Free talk rooms retrieved successfully' })
  async discoverFreeTalkRooms(
    @Query() paginationDto: PaginationDto,
    @Query('language') language?: string,
    @Query('level') level?: MeetingLevel,
    @Query('region') region?: string,
    @Query('topic') topic?: string
  ) {
    const filters = {
      language: language || undefined,
      level: level || undefined,
      region: region || undefined,
      topic: topic || undefined
    };

    return this.liveKitRoomsService.discoverFreeTalkRooms(paginationDto, filters);
  }

  @Get('discover/teacher-classes')
  @ApiOperation({ summary: 'Browse teacher classes and workshops' })
  @ApiResponse({ status: 200, description: 'Teacher classes retrieved successfully' })
  async discoverTeacherClasses(
    @Query() paginationDto: PaginationDto,
    @Query('language') language?: string,
    @Query('level') level?: MeetingLevel,
    @Query('min_price') minPrice?: number,
    @Query('max_price') maxPrice?: number,
    @Query('teacher_id') teacherId?: string,
    @Query('scheduled_only') scheduledOnly?: boolean
  ) {
    const filters = {
      language: language || undefined,
      level: level || undefined,
      min_price: minPrice,
      max_price: maxPrice,
      teacher_id: teacherId,
      scheduled_only: scheduledOnly === true
    };

    return this.liveKitRoomsService.discoverTeacherClasses(paginationDto, filters);
  }

  @Get('nearby/:region')
  @ApiOperation({ summary: 'Find rooms near your region' })
  @ApiResponse({ status: 200, description: 'Nearby rooms retrieved successfully' })
  async findNearbyRooms(
    @Param('region') region: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.liveKitRoomsService.findNearbyRooms(region, paginationDto);
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a LiveKit room' })
  @ApiResponse({ status: 200, description: 'Room joined successfully' })
  async joinRoom(
    @Param('roomId') roomId: string,
    @Body() joinRoomDto: JoinLiveKitRoomDto,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.joinRoom(roomId, joinRoomDto, req.user);
  }

  @Post(':roomId/leave')
  @ApiOperation({ summary: 'Leave a LiveKit room' })
  @ApiResponse({ status: 200, description: 'Room left successfully' })
  async leaveRoom(
    @Param('roomId') roomId: string,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.leaveRoom(roomId, req.user);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get room details and LiveKit token' })
  @ApiResponse({ status: 200, description: 'Room details retrieved successfully' })
  async getRoomDetails(
    @Param('roomId') roomId: string,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.getRoomDetails(roomId, req.user);
  }

  @Get(':roomId/token')
  @ApiOperation({ summary: 'Get LiveKit access token for room' })
  @ApiResponse({ status: 200, description: 'Access token generated successfully' })
  async getRoomToken(
    @Param('roomId') roomId: string,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.generateRoomToken(roomId, req.user);
  }

  @Post(':roomId/validate-payment')
  @ApiOperation({ summary: 'Validate payment for paid rooms' })
  @ApiResponse({ status: 200, description: 'Payment validated successfully' })
  async validatePayment(
    @Param('roomId') roomId: string,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.validatePayment(roomId, req.user);
  }

  // Community and Social Features
  @Get('community/global-chat')
  @ApiOperation({ summary: 'Get global community chat rooms' })
  @ApiResponse({ status: 200, description: 'Global chat rooms retrieved' })
  async getGlobalChatRooms(@Query() paginationDto: PaginationDto) {
    return this.liveKitRoomsService.getGlobalChatRooms(paginationDto);
  }

  @Get('community/topic/:topic')
  @ApiOperation({ summary: 'Get rooms by topic' })
  @ApiResponse({ status: 200, description: 'Topic rooms retrieved' })
  async getRoomsByTopic(
    @Param('topic') topic: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.liveKitRoomsService.getRoomsByTopic(topic, paginationDto);
  }

  @Get('my-rooms')
  @ApiOperation({ summary: 'Get user created rooms' })
  @ApiResponse({ status: 200, description: 'User rooms retrieved' })
  async getMyRooms(
    @Query() paginationDto: PaginationDto,
    @Request() req: any
  ) {
    return this.liveKitRoomsService.getUserRooms(req.user.id, paginationDto);
  }

  @Get('my-classes')
  @ApiOperation({ summary: 'Get user enrolled/teaching classes' })
  @ApiResponse({ status: 200, description: 'User classes retrieved' })
  async getMyClasses(
    @Query() paginationDto: PaginationDto,
    @Query('role') role?: 'teacher' | 'student',
    @Request() req?: any
  ) {
    return this.liveKitRoomsService.getUserClasses(req.user.id, paginationDto, role);
  }
}