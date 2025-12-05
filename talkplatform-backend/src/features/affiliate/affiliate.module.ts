import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/user.entity';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { MeetingParticipant } from '../meeting/entities/meeting-participant.entity';
import { AffiliateService } from './affiliate.service';
import { AffiliateController } from './affiliate.controller';
import { RevenueSweeperJob } from './revenue-sweeper.job';
import { AuthModule } from '../../auth/auth.module';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, CreditTransaction, Meeting, MeetingParticipant]),
    AuthModule,
    forwardRef(() => CreditsModule),
  ],
  controllers: [AffiliateController],
  providers: [AffiliateService, RevenueSweeperJob],
  exports: [AffiliateService],
})
export class AffiliateModule {}

