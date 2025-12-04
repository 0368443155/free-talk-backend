import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { User } from '../../users/user.entity';
import { NotificationGateway } from './notification.gateway';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    AuthModule,
  ],
  providers: [NotificationService, NotificationProcessor, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationsModule { }
