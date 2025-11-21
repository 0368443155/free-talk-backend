import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { CreditPackage } from './entities/credit-package.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../meeting/entities/meeting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditTransaction, CreditPackage, User, Meeting])
  ],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService]
})
export class CreditsModule {}