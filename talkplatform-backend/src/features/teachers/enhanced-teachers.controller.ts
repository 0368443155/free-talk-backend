import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, UploadedFile, UseInterceptors, Logger, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { EnhancedTeachersService } from './enhanced-teachers.service';
import { CreateTeacherProfileDto, UpdateTeacherProfileDto, CreateAvailabilityDto, CreateReviewDto } from './dto/teacher.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';
import { AffiliateService } from '../affiliate/affiliate.service';

@ApiTags('Enhanced Teachers')
@Controller('teachers/enhanced')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EnhancedTeachersController {
  private readonly logger = new Logger(EnhancedTeachersController.name);

  constructor(
    private readonly teachersService: EnhancedTeachersService,
    @Inject(forwardRef(() => AffiliateService))
    private readonly affiliateService: AffiliateService,
  ) {}

  // Teacher Profile Management
  @Post('profile')
  @ApiOperation({ summary: 'Create teacher profile (become a teacher)' })
  @ApiResponse({ status: 201, description: 'Teacher profile created successfully' })
  async createProfile(
    @Body() createProfileDto: CreateTeacherProfileDto,
    @Request() req: any
  ) {
    return this.teachersService.createTeacherProfile(createProfileDto, req.user);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get my teacher profile' })
  @ApiResponse({ status: 200, description: 'Teacher profile retrieved successfully' })
  async getMyProfile(@Request() req: any) {
    return this.teachersService.getTeacherProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update teacher profile' })
  @ApiResponse({ status: 200, description: 'Teacher profile updated successfully' })
  async updateProfile(
    @Body() updateProfileDto: UpdateTeacherProfileDto,
    @Request() req: any
  ) {
    return this.teachersService.updateTeacherProfile(req.user.id, updateProfileDto);
  }

  @Post('profile/intro-video')
  @ApiOperation({ summary: 'Upload teacher intro video' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('video'))
  async uploadIntroVideo(
    @UploadedFile() video: any, // Express.Multer.File,
    @Request() req: any
  ) {
    return this.teachersService.uploadIntroVideo(req.user.id, video);
  }

  @Post('profile/images')
  @ApiOperation({ summary: 'Upload profile images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @UploadedFile() image: any, // Express.Multer.File,
    @Request() req: any
  ) {
    return this.teachersService.uploadProfileImage(req.user.id, image);
  }

  // Teacher Discovery
  @Get('discover')
  @ApiOperation({ summary: 'Discover teachers with advanced filtering' })
  @ApiResponse({ status: 200, description: 'Teachers retrieved successfully' })
  async discoverTeachers(
    @Query() paginationDto: PaginationDto,
    @Query('language') language?: string,
    @Query('specialty') specialty?: string,
    @Query('min_rating') minRating?: number,
    @Query('max_rate') maxRate?: number,
    @Query('availability') availability?: string, // 'now', 'today', 'week'
    @Query('experience') experience?: string, // 'beginner', 'intermediate', 'expert'
    @Query('sort') sort?: string, // 'rating', 'price', 'experience', 'popularity'
  ) {
    const filters = {
      language,
      specialty,
      min_rating: minRating,
      max_rate: maxRate,
      availability,
      experience,
      sort: sort || 'rating'
    };

    return this.teachersService.discoverTeachers(paginationDto, filters);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured teachers' })
  @ApiResponse({ status: 200, description: 'Featured teachers retrieved successfully' })
  async getFeaturedTeachers(@Query() paginationDto: PaginationDto) {
    return this.teachersService.getFeaturedTeachers(paginationDto);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top-rated teachers' })
  @ApiResponse({ status: 200, description: 'Top-rated teachers retrieved successfully' })
  async getTopRatedTeachers(
    @Query() paginationDto: PaginationDto,
    @Query('language') language?: string
  ) {
    return this.teachersService.getTopRatedTeachers(paginationDto, language);
  }

  @Get(':teacherId/profile')
  @ApiOperation({ summary: 'Get teacher profile by ID' })
  @ApiResponse({ status: 200, description: 'Teacher profile retrieved successfully' })
  async getTeacherProfile(@Param('teacherId') teacherId: string) {
    return this.teachersService.getPublicTeacherProfile(teacherId);
  }

  // Availability Management
  @Post('availability')
  @ApiOperation({ summary: 'Set teacher availability' })
  @ApiResponse({ status: 201, description: 'Availability set successfully' })
  async setAvailability(
    @Body() availabilityDto: CreateAvailabilityDto,
    @Request() req: any
  ) {
    return this.teachersService.setAvailability(req.user.id, availabilityDto);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get my availability schedule' })
  @ApiResponse({ status: 200, description: 'Availability retrieved successfully' })
  async getMyAvailability(@Request() req: any) {
    return this.teachersService.getTeacherAvailability(req.user.id);
  }

  @Get(':teacherId/availability')
  @ApiOperation({ summary: 'Get teacher availability for booking' })
  @ApiResponse({ status: 200, description: 'Teacher availability retrieved successfully' })
  async getTeacherAvailability(
    @Param('teacherId') teacherId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string
  ) {
    return this.teachersService.getAvailableSlots(teacherId, startDate, endDate);
  }

  // Reviews and Ratings
  @Post(':teacherId/review')
  @ApiOperation({ summary: 'Leave a review for teacher' })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  async createReview(
    @Param('teacherId') teacherId: string,
    @Body() reviewDto: CreateReviewDto,
    @Request() req: any
  ) {
    return this.teachersService.createReview(teacherId, reviewDto, req.user);
  }

  @Get(':teacherId/reviews')
  @ApiOperation({ summary: 'Get teacher reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getTeacherReviews(
    @Param('teacherId') teacherId: string,
    @Query() paginationDto: PaginationDto,
    @Query('sort') sort?: string
  ) {
    return this.teachersService.getTeacherReviews(teacherId, paginationDto, sort);
  }

  @Put('reviews/:reviewId/respond')
  @ApiOperation({ summary: 'Teacher responds to review' })
  @ApiResponse({ status: 200, description: 'Review response added successfully' })
  async respondToReview(
    @Param('reviewId') reviewId: string,
    @Body('response') response: string,
    @Request() req: any
  ) {
    return this.teachersService.respondToReview(reviewId, response, req.user);
  }

  // Teaching Statistics
  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Get teacher dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getTeacherDashboard(@Request() req: any) {
    return this.teachersService.getTeacherDashboard(req.user.id);
  }

  @Get('stats/earnings')
  @ApiOperation({ summary: 'Get detailed earnings breakdown' })
  @ApiResponse({ status: 200, description: 'Earnings stats retrieved successfully' })
  async getEarningsStats(
    @Query('period') period?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Request() req?: any
  ) {
    return this.teachersService.getEarningsStats(req.user.id, period, startDate, endDate);
  }

  @Get('stats/students')
  @ApiOperation({ summary: 'Get student analytics' })
  @ApiResponse({ status: 200, description: 'Student stats retrieved successfully' })
  async getStudentStats(@Request() req: any) {
    return this.teachersService.getStudentStats(req.user.id);
  }

  // Class Scheduling
  @Post('classes/schedule')
  @ApiOperation({ summary: 'Schedule a class' })
  @ApiResponse({ status: 201, description: 'Class scheduled successfully' })
  async scheduleClass(
    @Body() scheduleDto: any, // TODO: Create ScheduleClassDto
    @Request() req: any
  ) {
    return this.teachersService.scheduleClass(scheduleDto, req.user);
  }

  @Get('classes/scheduled')
  @ApiOperation({ summary: 'Get scheduled classes' })
  @ApiResponse({ status: 200, description: 'Scheduled classes retrieved successfully' })
  async getScheduledClasses(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
    @Request() req?: any
  ) {
    return this.teachersService.getTeacherClasses(req.user.id, paginationDto, status);
  }

  // Affiliate Program
  @Get('affiliate/code')
  @ApiOperation({ summary: 'Get or generate affiliate code' })
  @ApiResponse({ status: 200, description: 'Affiliate code retrieved successfully' })
  async getAffiliateCode(@Request() req: any) {
    return this.teachersService.getOrCreateAffiliateCode(req.user.id);
  }

  @Get('affiliate/stats')
  @ApiOperation({ 
    summary: 'Get affiliate program statistics',
    deprecated: true,
    description: 'DEPRECATED: Use GET /affiliate/dashboard instead. This endpoint is maintained for backward compatibility and proxies to the new affiliate service.'
  })
  @ApiResponse({ status: 200, description: 'Affiliate stats retrieved successfully' })
  async getAffiliateStats(@Request() req: any) {
    // Proxy to new AffiliateService for backward compatibility
    return this.affiliateService.getStats(req.user.id);
  }

  @Get('affiliate/referrals')
  @ApiOperation({ 
    summary: 'Get referred students',
    deprecated: true,
    description: 'DEPRECATED: Use GET /affiliate/referrals instead. This endpoint is maintained for backward compatibility and proxies to the new affiliate service.'
  })
  @ApiResponse({ status: 200, description: 'Referral list retrieved successfully' })
  async getAffiliateReferrals(
    @Query() paginationDto: PaginationDto,
    @Request() req?: any
  ) {
    // Proxy to new AffiliateService for backward compatibility
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 20;
    return this.affiliateService.getReferrals(req.user.id, page, limit);
  }

  // Search and Recommendations
  @Get('search')
  @ApiOperation({ summary: 'Advanced teacher search' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchTeachers(
    @Query('q') query: string,
    @Query() paginationDto: PaginationDto,
    @Query('filters') filters?: string, // JSON encoded filters
    @Request() req?: any
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    return this.teachersService.searchTeachers(query, paginationDto, parsedFilters);
  }

  @Get('recommendations/:userId')
  @ApiOperation({ summary: 'Get teacher recommendations for user' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getRecommendations(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
    @Request() req?: any
  ) {
    return this.teachersService.getTeacherRecommendations(userId, paginationDto);
  }

  // Verification and Admin
  @Post('verification/submit')
  @ApiOperation({ summary: 'Submit profile for verification' })
  @ApiResponse({ status: 200, description: 'Verification request submitted' })
  async submitForVerification(@Request() req: any) {
    return this.teachersService.submitForVerification(req.user.id);
  }

  @Get('verification/status')
  @ApiOperation({ summary: 'Get verification status' })
  @ApiResponse({ status: 200, description: 'Verification status retrieved' })
  async getVerificationStatus(@Request() req?: any) {
    return this.teachersService.getVerificationStatus(req.user.id);
  }
}