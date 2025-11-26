import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { TeacherProfile } from '../features/teachers/entities/teacher-profile.entity';
import { GetTeachersQueryDto } from './dto/get-teachers-query-dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';

@Injectable()
export class TeachersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,

        @InjectRepository(TeacherProfile)
        private teacherProfilesRepository: Repository<TeacherProfile>,
    ) { }

    //API lấy danh sách giáo viên <public>
    async getTeachers(queryDto: GetTeachersQueryDto): Promise<{ teachers: Partial<User & TeacherProfile>[], total: number }> {
        const {
            page = 1,
            limit = 20,
            search,
            minRating,
            maxRate,
            sortBy = 'rating',
            sortOrder = 'desc',
            isVerified = 'true' //mặc định là string: true
        } = queryDto;

        const skip = (page - 1) * limit;
        const verifiedStatus = isVerified === 'true' //chuyển string sang boolean

        try {
            //dùng querybuilder để join và filter
            // Note: teacher_profiles table uses user_id as PRIMARY KEY (no separate id column)
            // Join on user_id column
            const query = this.usersRepository.createQueryBuilder('user')
                .leftJoinAndSelect('user.teacherProfile', 'profile') //leftJoin để không bỏ sót users
                .where('user.role = :role', { role: 'teacher' }) //chỉ lấy role teacher
                .andWhere('profile.user_id IS NOT NULL') // Chỉ lấy users có teacherProfile (use user_id instead of id)
                .andWhere('profile.is_verified = :isVerified', { isVerified: verifiedStatus }); //lọc theo isVerified

            //filter theo search
            if (search) {
                query.andWhere('(user.username LIKE :search OR profile.headline LIKE :search)', { search: `%${search}%` })
            }

            //filter theo maxRate
            // Note: Database only has 'hourly_rate' (int)
            if (maxRate !== undefined) {
                query.andWhere('profile.hourly_rate <= :maxRate', { maxRate })
            }

            //sorting
            let orderBy: string;
            switch (sortBy) {
                case 'rate':
                    orderBy = 'profile.hourly_rate';
                    break;
                case 'hours':
                    orderBy = 'profile.total_hours_taught';
                    break;
                case 'newest':
                    orderBy = 'user.created_at';
                    break;
                case 'rating':
                default:
                    orderBy = 'profile.average_rating';
                    break;
            }
            query.orderBy(orderBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

            //pagination
            query.skip(skip).take(limit);
            
            const [teacher, total] = await query.getManyAndCount();

            //loại bỏ các trường nhạy cảm như email và map data
            const sanitizedTeachers = teacher
                .filter(t => t.teacherProfile) // Đảm bảo có profile
                .map(teacher => {
                    const { password, ...userSafe } = teacher;
                    const profile = teacher.teacherProfile || {};
                    return { 
                        ...userSafe, 
                        ...profile,
                        // Đảm bảo các field quan trọng có giá trị
                        id: userSafe.id,
                        user_id: userSafe.id,
                        username: userSafe.username,
                        email: userSafe.email,
                        avatar_url: userSafe.avatar_url,
                        role: userSafe.role,
                        created_at: userSafe.created_at,
                        // Map các trường mới từ migration
                        total_reviews: profile.total_reviews || 0,
                        languages_taught: profile.languages_taught || [],
                        specialties: profile.specialties || [],
                        years_experience: profile.years_experience || 0,
                        total_students: profile.total_students || 0,
                        avg_response_time_hours: profile.avg_response_time_hours || 24,
                        is_available: profile.is_available !== undefined ? profile.is_available : true,
                        country: profile.country || null,
                        status: profile.status || 'pending',
                        hourly_rate_credits: profile.hourly_rate_credits || null,
                    };
                });
            return { teachers: sanitizedTeachers, total };
        } catch (error) {
            console.error("Error fetching teachers:", error);
            console.error("Error stack:", error.stack);
            throw new InternalServerErrorException(`Couldn't fetch teachers list: ${error.message || 'Unknown error'}`);
        }
    }

    // API lấy chi tiết teacher (public)
    async getTeacherById(id: string): Promise<Partial<User & TeacherProfile>> {
        const teacher = await this.usersRepository.findOne({
            where: { id: id, role: UserRole.TEACHER },
            relations: ['teacherProfile'], //tự động join teacherProfile
        });

        if (!teacher || !teacher.teacherProfile) {
            throw new NotFoundException(`Teacher with ID "${id}" not found`)
        }

        if (!teacher.teacherProfile.is_verified) {
            throw new ForbiddenException(`Teacher profile "${id}" is not verified yet`);
        }

        //reviews, schedules
        // const reviews = await this.reviewsService.getReviewsByTeacher(id, { limit: 5 });
        // const schedules = await this.schedulesService.getUpcomingSchedules(id);

        const { password, ...userSafe } = teacher;
        // delete userSafe.email; // Cân nhắc ẩn email

        return {
            ...userSafe,
            ...userSafe.teacherProfile,
            // recentReviews: reviews.reviews,
            // upcomingSchedules: schedules,
            // stats: { ... } // Thêm sau
        };
    }

    //API cập nhật Profile teacher {yêu cầu login teacher}
    async updateTeacherProfile(userId: string, updateDto: UpdateTeacherProfileDto): Promise<TeacherProfile> {
        //tìm profilêtacher dựa trên userID (khóa ngoại Tc Prf)
        let profile = await this.teacherProfilesRepository.findOneBy({ user_id: userId });

        if (!profile) {
            // If missing (e.g. user just became teacher), create a minimal profile first
            profile = new TeacherProfile();
            profile.user_id = userId;
            profile.hourly_rate_credits = 1;
            profile.average_rating = 0;
            profile.total_hours_taught = 0;
            profile.is_verified = false;
            await this.teacherProfilesRepository.insert(profile);
        }
        // Cập nhật các trường được phép
        if (updateDto.headline !== undefined) profile.headline = updateDto.headline;
        if (updateDto.bio !== undefined) profile.bio = updateDto.bio;
        if (updateDto.introVideoUrl !== undefined) profile.intro_video_url = updateDto.introVideoUrl;
        if (updateDto.hourlyRate !== undefined) profile.hourly_rate_credits = updateDto.hourlyRate;
        // Thêm các trường khác...

        try {
            await this.teacherProfilesRepository.save(profile);
            return profile;
        } catch (error) {
            console.error("Error updating teacher profile:", error);
            throw new InternalServerErrorException("Could not update teacher profile.");
        }
    }

    // Get teacher profile by user id (includes unverified)
    async getProfileByUserId(userId: string): Promise<TeacherProfile> {
        const profile = await this.teacherProfilesRepository.findOne({ where: { user_id: userId } });
        if (!profile) throw new NotFoundException('Teacher profile not found');
        return profile;
    }

    // User self-enroll to become a teacher
    async becomeTeacher(userId: string): Promise<{ user: User; profile: TeacherProfile }> {
        const user = await this.usersRepository.findOne({ where: { id: userId }, relations: ['teacherProfile'] });
        if (!user) throw new NotFoundException('User not found');

        // Create profile if not exists
        let profile = await this.teacherProfilesRepository.findOne({ where: { user_id: userId } });
        if (!profile) {
            profile = new TeacherProfile();
            profile.user_id = userId;
            profile.user = user;
            // Optional fields left undefined initially
            profile.hourly_rate_credits = 1;
            profile.average_rating = 0;
            profile.total_hours_taught = 0;
            profile.is_verified = false;
            await this.teacherProfilesRepository.insert(profile);
        }

        // Do NOT promote role here. User remains student until admin verifies.
        // Role promotion will be handled by AdminService.verifyTeacher.

        return { user, profile };
    }
}