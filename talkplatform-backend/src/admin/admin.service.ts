import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { User, UserRole } from '../users/user.entity';
import { TeacherProfile } from '../teachers/teacher-profile.entity';
import { TeacherVerification, VerificationStatus } from '../features/teachers/entities/teacher-verification.entity';
import { SelectQueryBuilder } from 'typeorm';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(TeacherProfile) private teacherRepo: Repository<TeacherProfile>,
    @InjectRepository(TeacherVerification) private verificationRepo: Repository<TeacherVerification>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async listUsers(options: { page?: number; limit?: number; role?: UserRole; search?: string }) {
    const { page = 1, limit = 20, role, search } = options;
    const qb = this.usersRepo.createQueryBuilder('user');
    
    if (role) {
      qb.where('user.role = :role', { role });
    }
    
    if (search) {
      qb.andWhere('(user.username ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    
    qb.orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    await this.usersRepo.save(user);
    return user;
  }

  async adjustUserCredits(userId: string, delta?: number, setTo?: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (typeof setTo === 'number') {
      user.credit_balance = Math.max(0, Math.floor(setTo));
    } else if (typeof delta === 'number') {
      user.credit_balance = Math.max(0, user.credit_balance + Math.floor(delta));
    }
    await this.usersRepo.save(user);
    return user;
  }

  async verifyTeacher(userId: string, is_verified: boolean) {
    const profile = await this.teacherRepo.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Teacher profile not found');
    profile.is_verified = is_verified;
    await this.teacherRepo.save(profile);

    // Promote or demote user role accordingly
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (is_verified) {
      user.role = UserRole.TEACHER;
    } else {
      // Optional: demote back to student when unverified
      if (user.role !== UserRole.ADMIN) {
        user.role = UserRole.STUDENT;
      }
    }
    await this.usersRepo.save(user);

    return { profile, user };
  }

  async listTeachers(options: { page?: number; limit?: number; is_verified?: boolean; search?: string }) {
    const { page = 1, limit = 20, is_verified, search } = options;

    const qb = this.teacherRepo.createQueryBuilder('profile')
      .leftJoinAndSelect(User, 'user', 'user.id = profile.user_id')
      .select([
        'profile.user_id as user_id',
        'profile.headline as headline',
        'profile.hourly_rate as hourly_rate',
        'profile.average_rating as average_rating',
        'profile.total_hours_taught as total_hours_taught',
        'profile.is_verified as is_verified',
        'profile.created_at as created_at',
        'user.username as username',
        'user.email as email',
        'user.role as role',
      ]);

    if (typeof is_verified === 'boolean') {
      qb.where('profile.is_verified = :is_verified', { is_verified });
    }
    if (search) {
      qb.andWhere('(user.username LIKE :kw OR user.email LIKE :kw OR profile.headline LIKE :kw)', { kw: `%${search}%` });
    }

    qb.orderBy('profile.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany(),
      qb.getCount(),
    ]);

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private feesKey = 'platform:fees';
  async getPlatformFees() {
    const cached = await this.redis.get(this.feesKey);
    if (cached) return JSON.parse(cached);
    // Defaults: 70/30 for platform-sourced students, 30/70 for teacher-affiliate students
    const defaults = {
      platformStudent: { platform: 0.7, teacher: 0.3 },
      teacherAffiliateStudent: { platform: 0.3, teacher: 0.7 },
    };
    return defaults;
  }

  async setPlatformFees(fees: any) {
    await this.redis.set(this.feesKey, JSON.stringify(fees));
    return fees;
  }

  async getUserById(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(userId: string, updateData: { username?: string; email?: string }) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    
    if (updateData.username) user.username = updateData.username;
    if (updateData.email) user.email = updateData.email;
    
    await this.usersRepo.save(user);
    return user;
  }

  async deleteUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    
    // Soft delete: Set role to a special status or use deleted_at field
    // For now, we'll actually delete the user
    // In production, consider soft delete with deleted_at field
    await this.usersRepo.remove(user);
    return { message: 'User deleted successfully' };
  }

  async createUser(userData: { username: string; email: string; password: string; role: UserRole }) {
    // Check if user already exists
    const existingUser = await this.usersRepo.findOne({
      where: [{ email: userData.email }, { username: userData.username }],
    });
    
    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }
    
    const user = this.usersRepo.create({
      username: userData.username,
      email: userData.email,
      password: userData.password, // Will be hashed by BeforeInsert hook
      role: userData.role,
    });
    
    await this.usersRepo.save(user);
    // Remove password from response
    delete (user as any).password;
    return user;
  }

  async listTeacherVerifications(options: { 
    page?: number; 
    limit?: number; 
    status?: VerificationStatus; 
    search?: string 
  }) {
    const { page = 1, limit = 20, status, search } = options;
    
    const qb = this.verificationRepo.createQueryBuilder('verification')
      .leftJoinAndSelect('verification.user', 'user')
      .leftJoinAndSelect('verification.degree_certificates', 'degree_certs')
      .leftJoinAndSelect('verification.teaching_certificates', 'teaching_certs')
      .leftJoinAndSelect('verification.references', 'refs')
      .select([
        'verification.id',
        'verification.user_id',
        'verification.status',
        'verification.identity_card_front',
        'verification.identity_card_back',
        'verification.cv_url',
        'verification.years_of_experience',
        'verification.previous_platforms',
        'verification.admin_notes',
        'verification.rejection_reason',
        'verification.reviewed_by',
        'verification.verified_at',
        'verification.resubmission_count',
        'verification.last_submitted_at',
        'verification.created_at',
        'verification.updated_at',
        'user.id',
        'user.username',
        'user.email',
        'user.avatar_url',
        'degree_certs.id',
        'degree_certs.name',
        'degree_certs.year',
        'degree_certs.data',
        'teaching_certs.id',
        'teaching_certs.name',
        'teaching_certs.issuer',
        'teaching_certs.year',
        'teaching_certs.data',
        'refs.id',
        'refs.name',
        'refs.email',
        'refs.relationship',
      ]);

    if (status) {
      qb.where('verification.status = :status', { status });
    }

    if (search) {
      qb.andWhere('(user.username ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('verification.last_submitted_at', 'DESC')
      .addOrderBy('verification.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    
    return { 
      data, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit) 
    };
  }
}
