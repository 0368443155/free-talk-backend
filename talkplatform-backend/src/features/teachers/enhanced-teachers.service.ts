import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual } from 'typeorm';
import { TeacherProfile, TeacherStatus, TeacherSpecialty } from './entities/teacher-profile.entity';
import { TeacherReview } from './entities/teacher-review.entity';
import { TeacherAvailability, AvailabilityType } from './entities/teacher-availability.entity';
import { User, UserRole } from '../../users/user.entity';
import { Meeting, MeetingType } from '../meeting/entities/meeting.entity';
import { CreateTeacherProfileDto, UpdateTeacherProfileDto, CreateAvailabilityDto, CreateReviewDto } from './dto/teacher.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@Injectable()
export class EnhancedTeachersService {
  private readonly logger = new Logger(EnhancedTeachersService.name);

  constructor(
    @InjectRepository(TeacherProfile)
    private teacherProfileRepository: Repository<TeacherProfile>,
    @InjectRepository(TeacherReview)
    private reviewRepository: Repository<TeacherReview>,
    @InjectRepository(TeacherAvailability)
    private availabilityRepository: Repository<TeacherAvailability>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>
  ) { }

  // Teacher Profile Management
  async createTeacherProfile(dto: CreateTeacherProfileDto, user: User) {
    // Check if profile already exists
    const existingProfile = await this.teacherProfileRepository.findOne({
      where: { user_id: user.id }
    });

    if (existingProfile) {
      throw new BadRequestException('Teacher profile already exists');
    }

    // Generate unique affiliate code
    const affiliateCode = await this.generateUniqueAffiliateCode(user.username);

    const profile = this.teacherProfileRepository.create({
      user,
      user_id: user.id,
      headline: dto.headline,
      bio: dto.bio,
      languages_taught: dto.languages_taught,
      specialties: dto.specialties,
      education: dto.education,
      certifications: dto.certifications || [],
      years_experience: dto.years_experience,
      timezone: dto.timezone || 'UTC',
      spoken_languages: dto.spoken_languages || [],
      hourly_rate_credits: dto.hourly_rate_credits,
      min_session_duration: dto.min_session_duration || 30,
      max_session_duration: dto.max_session_duration || 120,
      teaching_styles: dto.teaching_styles || [],
      age_groups: dto.age_groups || [],
      auto_approve_bookings: dto.auto_approve_bookings !== false,
      booking_lead_time_hours: dto.booking_lead_time_hours || 24,
      affiliate_code: affiliateCode,
      status: TeacherStatus.PENDING,
      cancellation_policy: {
        free_cancellation_hours: 24,
        partial_refund_hours: 12,
        no_refund_hours: 2
      }
    });

    const savedProfile = await this.teacherProfileRepository.save(profile);

    // Update user role
    user.role = UserRole.TEACHER;
    user.affiliate_code = affiliateCode;
    await this.userRepository.save(user);

    this.logger.log(`Teacher profile created for user ${user.id}`);

    return {
      profile: savedProfile,
      message: 'Teacher profile created successfully. Pending verification.',
      next_steps: [
        'Upload intro video',
        'Set your availability',
        'Add profile images',
        'Wait for verification'
      ]
    };
  }

  async getTeacherProfile(userId: string) {
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: userId },
      relations: ['user', 'reviews', 'availability']
    });

    if (!profile) {
      throw new NotFoundException('Teacher profile not found');
    }

    return {
      profile,
      stats: await this.getTeacherStats(profile.id),
      verification_status: {
        status: profile.status,
        is_verified: profile.is_verified,
        requirements: await this.getVerificationRequirements(profile)
      }
    };
  }

  async getPublicTeacherProfile(teacherId: string) {
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: teacherId, status: TeacherStatus.APPROVED },
      relations: ['user']
    });

    if (!profile) {
      throw new NotFoundException('Teacher not found or not approved');
    }

    const recentReviews = await this.reviewRepository.find({
      where: { teacher_id: profile.id, is_public: true },
      relations: ['student'],
      order: { created_at: 'DESC' },
      take: 5
    });

    return {
      profile: {
        ...profile,
        user: {
          id: profile.user.id,
          username: profile.user.username,
          avatar_url: profile.user.avatar_url
        }
      },
      recent_reviews: recentReviews.map(review => ({
        ...review,
        student: review.is_anonymous ? null : {
          username: review.student.username,
          avatar_url: review.student.avatar_url
        }
      })),
      availability_preview: await this.getAvailabilityPreview(profile.id),
      stats: await this.getPublicTeacherStats(profile.id)
    };
  }

  async updateTeacherProfile(userId: string, dto: UpdateTeacherProfileDto) {
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: userId }
    });

    if (!profile) {
      throw new NotFoundException('Teacher profile not found');
    }

    // Update profile fields
    Object.assign(profile, dto);
    profile.updated_at = new Date();

    const updatedProfile = await this.teacherProfileRepository.save(profile);

    this.logger.log(`Teacher profile updated for user ${userId}`);

    return {
      profile: updatedProfile,
      message: 'Profile updated successfully'
    };
  }

  // Teacher Discovery
  async discoverTeachers(paginationDto: PaginationDto, filters: any) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.teacherProfileRepository.createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where('profile.status = :status', { status: TeacherStatus.APPROVED })
      .andWhere('profile.is_available = :available', { available: true });

    // Apply filters
    if (filters.language) {
      queryBuilder.andWhere('JSON_CONTAINS(profile.languages_taught, :language)',
        { language: JSON.stringify(filters.language) });
    }

    if (filters.specialty) {
      queryBuilder.andWhere('JSON_CONTAINS(profile.specialties, :specialty)',
        { specialty: JSON.stringify(filters.specialty) });
    }

    if (filters.min_rating) {
      queryBuilder.andWhere('profile.average_rating >= :minRating', { minRating: filters.min_rating });
    }

    if (filters.max_rate) {
      queryBuilder.andWhere('profile.hourly_rate_credits <= :maxRate', { maxRate: filters.max_rate });
    }

    if (filters.experience) {
      const experienceMap = {
        'beginner': [0, 2],
        'intermediate': [2, 5],
        'expert': [5, 50]
      };
      const [min, max] = experienceMap[filters.experience] || [0, 50];
      queryBuilder.andWhere('profile.years_experience >= :minExp AND profile.years_experience <= :maxExp',
        { minExp: min, maxExp: max });
    }

    // Apply sorting
    switch (filters.sort) {
      case 'rating':
        queryBuilder.orderBy('profile.average_rating', 'DESC');
        break;
      case 'price':
        queryBuilder.orderBy('profile.hourly_rate_credits', 'ASC');
        break;
      case 'experience':
        queryBuilder.orderBy('profile.years_experience', 'DESC');
        break;
      case 'popularity':
        queryBuilder.orderBy('profile.total_students', 'DESC');
        break;
      default:
        queryBuilder.orderBy('profile.average_rating', 'DESC')
          .addOrderBy('profile.total_students', 'DESC');
    }

    const [teachers, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: await Promise.all(teachers.map(async teacher => ({
        ...teacher,
        next_available: await this.getNextAvailableSlot(teacher.id),
        student_feedback_summary: await this.getStudentFeedbackSummary(teacher.id)
      }))),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getFeaturedTeachers(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Featured teachers based on rating, student count, and verification
    const [teachers, total] = await this.teacherProfileRepository.findAndCount({
      where: {
        status: TeacherStatus.APPROVED,
        is_verified: true,
        is_available: true
      },
      relations: ['user'],
      order: {
        average_rating: 'DESC',
        total_students: 'DESC',
        is_verified: 'DESC'
      },
      skip,
      take: limit
    });

    return {
      data: teachers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getTopRatedTeachers(paginationDto: PaginationDto, language?: string) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.teacherProfileRepository.createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where('profile.status = :status', { status: TeacherStatus.APPROVED })
      .andWhere('profile.average_rating >= :minRating', { minRating: 4.5 })
      .andWhere('profile.total_reviews >= :minReviews', { minReviews: 10 });

    if (language) {
      queryBuilder.andWhere('JSON_CONTAINS(profile.languages_taught, :language)',
        { language: JSON.stringify(language) });
    }

    const [teachers, total] = await queryBuilder
      .orderBy('profile.average_rating', 'DESC')
      .addOrderBy('profile.total_reviews', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: teachers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  // Availability Management
  async setAvailability(userId: string, dto: CreateAvailabilityDto) {
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: userId }
    });

    if (!profile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const availability = this.availabilityRepository.create({
      teacher: profile,
      teacher_id: profile.id,
      availability_type: dto.availability_type,
      day_of_week: dto.day_of_week,
      date: dto.date ? new Date(dto.date) : undefined,
      start_time: dto.start_time,
      end_time: dto.end_time,
      timezone: dto.timezone || profile.timezone,
      is_available: dto.is_available !== false,
      notes: dto.notes,
      max_bookings: dto.max_bookings || 1
    });

    const savedAvailability = await this.availabilityRepository.save(availability);

    this.logger.log(`Availability set for teacher ${userId}`);

    return {
      availability: savedAvailability,
      message: 'Availability updated successfully'
    };
  }

  async getTeacherAvailability(userId: string) {
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: userId }
    });

    if (!profile) {
      throw new NotFoundException('Teacher profile not found');
    }

    const availability = await this.availabilityRepository.find({
      where: { teacher_id: profile.id },
      order: { day_of_week: 'ASC', start_time: 'ASC' }
    });

    return {
      regular_schedule: availability.filter(a => a.availability_type === AvailabilityType.REGULAR),
      exceptions: availability.filter(a => a.availability_type === AvailabilityType.EXCEPTION),
      vacations: availability.filter(a => a.availability_type === AvailabilityType.VACATION)
    };
  }

  async getAvailableSlots(teacherId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: teacherId }
    });

    if (!profile) {
      throw new NotFoundException('Teacher not found');
    }

    // TODO: Implement complex availability slot calculation
    // This would involve checking regular schedule, exceptions, existing bookings, etc.

    return {
      available_slots: [],
      teacher_timezone: profile.timezone,
      booking_policy: {
        lead_time_hours: profile.booking_lead_time_hours,
        auto_approve: profile.auto_approve_bookings,
        cancellation_policy: profile.cancellation_policy
      }
    };
  }

  // Reviews and Ratings
  async createReview(teacherId: string, dto: CreateReviewDto, student: User) {
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: teacherId }
    });

    if (!profile) {
      throw new NotFoundException('Teacher not found');
    }

    // Check if student has taken a class with this teacher
    const hasAttendedClass = await this.meetingRepository.count({
      where: {
        host: { id: teacherId },
        participants: {
          user: { id: student.id }
        }
      }
    });

    if (hasAttendedClass === 0) {
      throw new BadRequestException('You can only review teachers you have taken classes with');
    }

    // Check if review already exists
    const existingReview = await this.reviewRepository.findOne({
      where: {
        teacher_id: profile.id,
        student_id: student.id,
        meeting_id: dto.meeting_id || undefined
      }
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this teacher for this class');
    }

    const review = this.reviewRepository.create({
      teacher: profile,
      teacher_id: profile.id,
      student,
      student_id: student.id,
      meeting_id: dto.meeting_id,
      rating: dto.rating,
      comment: dto.comment,
      detailed_ratings: dto.detailed_ratings,
      tags: dto.tags || [],
      is_anonymous: dto.is_anonymous || false
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update teacher's rating statistics
    await this.updateTeacherRatingStats(profile.id);

    this.logger.log(`Review created for teacher ${teacherId} by student ${student.id}`);

    return {
      review: savedReview,
      message: 'Review submitted successfully'
    };
  }

  async getTeacherReviews(teacherId: string, paginationDto: PaginationDto, sort?: string) {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: teacherId }
    });

    if (!profile) {
      throw new NotFoundException('Teacher not found');
    }

    const queryBuilder = this.reviewRepository.createQueryBuilder('review')
      .leftJoinAndSelect('review.student', 'student')
      .leftJoinAndSelect('review.meeting', 'meeting')
      .where('review.teacher_id = :teacherId', { teacherId: profile.id })
      .andWhere('review.is_public = :isPublic', { isPublic: true });

    // Apply sorting
    switch (sort) {
      case 'newest':
        queryBuilder.orderBy('review.created_at', 'DESC');
        break;
      case 'oldest':
        queryBuilder.orderBy('review.created_at', 'ASC');
        break;
      case 'highest_rated':
        queryBuilder.orderBy('review.rating', 'DESC');
        break;
      case 'lowest_rated':
        queryBuilder.orderBy('review.rating', 'ASC');
        break;
      default:
        queryBuilder.orderBy('review.created_at', 'DESC');
    }

    const [reviews, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: reviews.map(review => ({
        ...review,
        student: review.is_anonymous ? null : {
          username: review.student.username,
          avatar_url: review.student.avatar_url
        }
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      rating_breakdown: await this.getRatingBreakdown(profile.id)
    };
  }

  // Helper Methods
  private async generateUniqueAffiliateCode(username: string): Promise<string> {
    const baseCode = username.substring(0, 8).toUpperCase();
    let code = baseCode;
    let counter = 1;

    while (await this.teacherProfileRepository.findOne({ where: { affiliate_code: code } })) {
      code = `${baseCode}${counter}`;
      counter++;
    }

    return code;
  }

  private async getTeacherStats(teacherId: string) {
    // TODO: Implement comprehensive teacher statistics
    return {
      total_classes: 0,
      total_hours: 0,
      this_month_classes: 0,
      this_month_earnings: 0,
      student_retention_rate: 0,
      average_class_rating: 0
    };
  }

  private async getPublicTeacherStats(teacherId: string) {
    const profile = await this.teacherProfileRepository.findOne({ where: { user_id: teacherId } });
    return {
      total_students: profile?.total_students || 0,
      total_hours: profile?.total_hours_taught || 0,
      average_rating: profile?.average_rating || 0,
      total_reviews: profile?.total_reviews || 0,
      response_rate: profile?.response_rate || 0
    };
  }

  private async getVerificationRequirements(profile: TeacherProfile) {
    return {
      profile_complete: !!(profile.bio && profile.headline && profile.languages_taught.length > 0),
      intro_video_uploaded: !!profile.intro_video_url,
      certifications_uploaded: profile.certifications && profile.certifications.length > 0,
      availability_set: false, // TODO: Check if availability is set
      profile_images_uploaded: profile.profile_images && profile.profile_images.length > 0
    };
  }

  /**
   * Cập nhật rating stats với Bayesian Average
   * 
   * Formula: WR = (v/(v+m)) * R + (m/(v+m)) * C
   * - v: số lượng reviews của giáo viên
   * - m: ngưỡng tối thiểu (minimum threshold)
   * - R: điểm trung bình của giáo viên
   * - C: điểm trung bình của toàn hệ thống
   */
  private async updateTeacherRatingStats(teacherId: string) {
    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg_rating')
      .addSelect('COUNT(*)', 'total_reviews')
      .where('review.teacher_id = :teacherId', { teacherId })
      .getRawOne();

    const avgRating = parseFloat(stats.avg_rating) || 0;
    const totalReviews = parseInt(stats.total_reviews) || 0;

    // Tính Bayesian Average
    const bayesianRating = this.calculateBayesianRating(avgRating, totalReviews);

    await this.teacherProfileRepository.update(teacherId, {
      average_rating: bayesianRating, // Lưu Bayesian rating thay vì raw average
      total_reviews: totalReviews,
      // Lưu thêm raw average để tham khảo
      // (có thể thêm field raw_average_rating nếu cần)
    });
  }

  /**
   * Tính Bayesian Average Rating
   * 
   * @param teacherRating Điểm trung bình của giáo viên
   * @param reviewCount Số lượng reviews
   * @param minimumThreshold Ngưỡng tối thiểu (mặc định: 5)
   * @param systemAverage Điểm trung bình hệ thống (mặc định: 4.5)
   */
  private calculateBayesianRating(
    teacherRating: number,
    reviewCount: number,
    minimumThreshold: number = 5,
    systemAverage: number = 4.5,
  ): number {
    const v = reviewCount; // Số lượng reviews
    const m = minimumThreshold; // Ngưỡng tối thiểu
    const R = teacherRating; // Điểm trung bình của giáo viên
    const C = systemAverage; // Điểm trung bình hệ thống

    // Nếu chưa có review, trả về system average
    if (v === 0) {
      return C;
    }

    // Formula: WR = (v/(v+m)) * R + (m/(v+m)) * C
    const weight = v / (v + m);
    const bayesianRating = weight * R + (1 - weight) * C;

    // Làm tròn đến 2 chữ số thập phân
    return Math.round(bayesianRating * 100) / 100;
  }

  /**
   * Lấy system average rating (điểm trung bình của tất cả giáo viên)
   */
  private async getSystemAverageRating(): Promise<number> {
    const result = await this.teacherProfileRepository
      .createQueryBuilder('profile')
      .select('AVG(profile.average_rating)', 'system_avg')
      .where('profile.total_reviews > 0')
      .getRawOne();

    return parseFloat(result?.system_avg) || 4.5; // Default 4.5 nếu chưa có data
  }

  private async getRatingBreakdown(teacherId: string) {
    const breakdown = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.teacher_id = :teacherId', { teacherId })
      .groupBy('review.rating')
      .orderBy('review.rating', 'DESC')
      .getRawMany();

    return breakdown.reduce((acc, item) => {
      acc[`rating_${item.rating}`] = parseInt(item.count);
      return acc;
    }, {});
  }

  private async getNextAvailableSlot(teacherId: string) {
    // TODO: Implement next available slot calculation
    return null;
  }

  private async getStudentFeedbackSummary(teacherId: string) {
    // TODO: Implement student feedback summary
    return {
      most_common_tags: [],
      strengths: [],
      improvement_areas: []
    };
  }

  private async getAvailabilityPreview(teacherId: string) {
    // TODO: Implement availability preview for next few days
    return [];
  }

  // Placeholder implementations for remaining methods
  async respondToReview(reviewId: string, response: string, teacher: User) {
    // TODO: Implement teacher response to reviews
    return { success: true };
  }

  async getTeacherDashboard(teacherId: string) {
    // TODO: Implement teacher dashboard
    return {};
  }

  async getEarningsStats(teacherId: string, period?: string, startDate?: string, endDate?: string) {
    // TODO: Implement earnings statistics
    return {};
  }

  async getStudentStats(teacherId: string) {
    // TODO: Implement student analytics
    return {};
  }

  async scheduleClass(scheduleDto: any, teacher: User) {
    // TODO: Implement class scheduling
    return {};
  }

  async getTeacherClasses(teacherId: string, paginationDto: PaginationDto, status?: string) {
    // TODO: Implement get teacher classes
    return { data: [], pagination: {} };
  }

  async getOrCreateAffiliateCode(teacherId: string) {
    // TODO: Implement affiliate code management
    return {};
  }

  async getAffiliateStats(teacherId: string) {
    // TODO: Implement affiliate statistics
    return {};
  }

  async getAffiliateReferrals(teacherId: string, paginationDto: PaginationDto) {
    // TODO: Implement affiliate referrals
    return { data: [], pagination: {} };
  }

  async searchTeachers(query: string, paginationDto: PaginationDto, filters: any) {
    // TODO: Implement advanced teacher search
    return { data: [], pagination: {} };
  }

  async getTeacherRecommendations(userId: string, paginationDto: PaginationDto) {
    // TODO: Implement teacher recommendations
    return { data: [], pagination: {} };
  }

  async submitForVerification(teacherId: string) {
    // TODO: Implement verification submission
    return {};
  }

  async getVerificationStatus(teacherId: string) {
    // TODO: Implement verification status check
    return {};
  }

  async uploadIntroVideo(teacherId: string, video: any) { // Express.Multer.File
    // TODO: Implement video upload
    return {};
  }

  async uploadProfileImage(teacherId: string, image: any) { // Express.Multer.File
    // TODO: Implement image upload
    return {};
  }
}