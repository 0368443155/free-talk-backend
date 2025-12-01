import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingParticipant, ParticipantRole } from '../../../meeting/entities/meeting-participant.entity';

@Injectable()
export class IsModeratorGuard implements CanActivate {
  constructor(
    @InjectRepository(MeetingParticipant)
    private readonly participantRepository: Repository<MeetingParticipant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId;
    const userId = request.user?.id;

    if (!roomId || !userId) {
      throw new ForbiddenException('Room ID and user ID are required');
    }

    const participant = await this.participantRepository.findOne({
      where: {
        meeting: { id: roomId },
        user: { id: userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('User is not a participant in this room');
    }

    if (
      participant.role !== ParticipantRole.HOST &&
      participant.role !== ParticipantRole.MODERATOR
    ) {
      throw new ForbiddenException('Only host or moderator can perform this action');
    }

    return true;
  }
}

