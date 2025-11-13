// src/features/meeting/classrooms.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classroom } from './entities/classroom.entity';
import { ClassroomMember } from './entities/classroom-member.entity';
import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { MeetingParticipant, ParticipantRole } from './entities/meeting-participant.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassroomMember)
    private readonly classroomMemberRepository: Repository<ClassroomMember>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
  ) {}

  async create(createClassroomDto: CreateClassroomDto, user: User) {
    console.log('Creating classroom for user:', user.id, user.role);

    // Only teachers can create classrooms
    if (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only teachers can create classrooms');
    }

    // Create classroom first
    const classroom = this.classroomRepository.create({
      ...createClassroomDto,
      teacher: user,
    });

    console.log('Created classroom object:', classroom);

    const savedClassroom = await this.classroomRepository.save(classroom);
    console.log('Saved classroom:', savedClassroom);

    // Create teacher member
    const teacherMember = this.classroomMemberRepository.create({
      classroom: savedClassroom,
      user,
      role: 'assistant',
      joined_at: new Date(),
    });

    console.log('Created teacher member:', teacherMember);

    const savedMember = await this.classroomMemberRepository.save(teacherMember);
    console.log('Saved teacher member:', savedMember);

    // Return classroom with members
    const result = await this.classroomRepository.findOne({
      where: { id: savedClassroom.id },
      relations: ['teacher', 'members', 'members.user'],
    });

    console.log('Final result:', result);
    return result;
  }

  async findAll(user: User, paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const query = this.classroomRepository
      .createQueryBuilder('classroom')
      .leftJoinAndSelect('classroom.teacher', 'teacher')
      .leftJoinAndSelect('classroom.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser');

    // If student, only show classrooms they're a member of or public ones
    if (user.role === UserRole.STUDENT) {
      query.where(
        '(teacher.id = :userId OR memberUser.id = :userId OR classroom.is_active = :isActive)',
        { userId: user.id, isActive: true },
      );
    }

    const [classrooms, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: classrooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: User) {
    const classroom = await this.classroomRepository.findOne({
      where: { id },
      relations: ['teacher', 'members', 'members.user'],
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    // Check access
    const hasAccess =
      classroom.teacher.id === user.id ||
      classroom.members.some((member) => member.user.id === user.id) ||
      user.role === UserRole.ADMIN;

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this classroom');
    }

    return classroom;
  }

  async update(id: string, updateClassroomDto: UpdateClassroomDto, user: User) {
    const classroom = await this.findOne(id, user);

    if (classroom.teacher.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the teacher can update this classroom');
    }

    Object.assign(classroom, updateClassroomDto);
    return this.classroomRepository.save(classroom);
  }

  async remove(id: string, user: User) {
    const classroom = await this.findOne(id, user);

    if (classroom.teacher.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the teacher can delete this classroom');
    }

    await this.classroomRepository.remove(classroom);
    return { message: 'Classroom deleted successfully' };
  }

  // ==================== CLASSROOM MEETINGS ====================

  async createClassroomMeeting(
    classroomId: string,
    createMeetingDto: CreateMeetingDto,
    user: User,
  ) {
    // Verify classroom exists and user is the teacher
    const classroom = await this.classroomRepository.findOne({
      where: { id: classroomId },
      relations: ['teacher'],
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    if (classroom.teacher.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the teacher can create meetings in this classroom');
    }

    // Create meeting for classroom
    const meeting = this.meetingRepository.create({
      ...createMeetingDto,
      classroom: { id: classroom.id } as any, // Explicitly set classroom by ID
      host: user,
      is_classroom_only: true,
      settings: {
        allow_screen_share: true,
        allow_chat: true,
        allow_reactions: true,
        record_meeting: false,
        waiting_room: false,
        auto_record: false,
        mute_on_join: false,
        ...createMeetingDto.settings,
      },
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    // Add host as participant
    const hostParticipant = this.participantRepository.create({
      meeting: savedMeeting,
      user,
      role: ParticipantRole.HOST,
      joined_at: new Date(),
      is_online: false,
    });

    await this.participantRepository.save(hostParticipant);
    
    // Reload meeting with classroom relation
    const meetingWithClassroom = await this.meetingRepository.findOne({
      where: { id: savedMeeting.id },
      relations: ['classroom', 'host'],
    });

    return meetingWithClassroom || savedMeeting;
  }

  async getClassroomMeetings(
    classroomId: string,
    user: User,
    paginationDto: PaginationDto,
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // Verify user has access to classroom
    await this.findOne(classroomId, user);

    const [meetings, total] = await this.meetingRepository.findAndCount({
      where: { classroom: { id: classroomId } },
      relations: ['host', 'participants', 'participants.user', 'classroom'],
      order: { scheduled_at: 'DESC', created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: meetings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getClassroomMeeting(classroomId: string, meetingId: string, user: User) {
    // Verify user has access to classroom
    await this.findOne(classroomId, user);

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId, classroom: { id: classroomId } },
      relations: ['host', 'participants', 'participants.user', 'classroom'],
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found in this classroom');
    }

    return meeting;
  }
}