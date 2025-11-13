import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { TeacherProfile } from './teacher-profile.entity';
import { GetTeachersQueryDto } from './dto/get-teachers-query-dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';

@Injectable()
export class TeachersService {
    constructor(
        @InjectRepository(User) 
        private usersRepository: Repository<User>,

        @InjectRepository(TeacherProfile)
        private teacherProfilesRepository: Repository<TeacherProfile>,
    ) {}

    //API lấy danh sách giáo viên <public>
    async getTeachers(queryDto: GetTeachersQueryDto): Promise<{ teachers: Partial<User & TeacherProfile>[], total: number}> {
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

        const skip = (page - 1)* limit;
        const verifiedStatus = isVerified === 'true' //chuyển string sang boolean

        //dùng querybuilder để join và filter
        const query = this.usersRepository.createQueryBuilder('user')
            .innerJoinAndSelect('user.teacherProfile', 'profile') //join với teacherProfile
            .where('user.role = :role', {role: 'teacher'}) //chỉ lấy role teacher
            .andWhere('profile.is_verified = :isVerified', {isVerified: verifiedStatus}); //lọc theo isVerified
        
        //filter theo search
        if(search){
            query.andWhere('(user.username LIKE :search OR profile.headline LIKE :search)', {search: `%${search}%`})
        }

        //filter theo maxRate
        if(maxRate !== undefined){
            query.andWhere('profile.hourly_rate <= :maxRate', {maxRate})
        }

        //sorting
        let orderBy: string;
        switch (sortBy) {
            case 'rate':
                orderBy = 'profile.hourly_rate';
                break;
            case 'hours':
                orderBy = 'profile.total_hours_taught'; // Giả sử có cột này
                break;
            case 'newest':
                orderBy = 'user.created_at';
                break;
            case 'rating':
            default:
                orderBy = 'profile.average_rating'; // Giả sử có cột này
                break;
        }
        query.orderBy(orderBy, sortOrder.toUpperCase() as 'ASC' | 'DESC');

        //pagination
        query.skip(skip).take(limit);
        try {
            const [teacher, total] = await query.getManyAndCount();

            //loại bỏ các trường nhạy cảm như email
            const sanitizedTeachers = teacher.map( teacher => {
                const {password, ...userSafe} = teacher;
                return {...userSafe, ...userSafe.teacherProfile}; //gộp user và profile
            });
            return {teachers : sanitizedTeachers, total};
        } catch (error) {
            console.error("Error fetching teachers:", error);
            throw new InternalServerErrorException("Couldnt fetch teachers list.");
        }
    }

    // API lấy chi tiết teacher (public)
    async getTeacherById(id: string): Promise<Partial<User & TeacherProfile>>{
        const teacher = await this.usersRepository.findOne({
            where: {id: id, role: UserRole.TEACHER},
            relations: ['teacherProfile'], //tự động join teacherProfile
        });

        if (!teacher || !teacher.teacherProfile){
            throw new NotFoundException(`Teacher with ID "${id}" not found`)
        }

        if (!teacher.teacherProfile.is_verified){
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
        const profile = await this.teacherProfilesRepository.findOneBy({user_id: userId});

        if (!profile){
            //không nên xảy ra nếu có role 'teacher'
            throw new NotFoundException(`Teacher profile not found for user ID "${userId}"`);
        }
        // Cập nhật các trường được phép
        if (updateDto.headline !== undefined) profile.headline = updateDto.headline;
        if (updateDto.bio !== undefined) profile.bio = updateDto.bio;
        if (updateDto.introVideoUrl !== undefined) profile.intro_video_url = updateDto.introVideoUrl;
        if (updateDto.hourlyRate !== undefined) profile.hourly_rate = updateDto.hourlyRate;
        // Thêm các trường khác...

        try {
            await this.teacherProfilesRepository.save(profile);
            return profile;
        } catch (error) {
            console.error("Error updating teacher profile:", error);
            throw new InternalServerErrorException("Could not update teacher profile.");
        }
    }
}
