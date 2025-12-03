import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getQueueToken } from '@nestjs/bull';
import { NotificationService } from './notification.service';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let notificationQueue: any;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    notificationQueue = module.get(getQueueToken('notifications'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should create notification and add to queue', async () => {
      const dto = {
        userId: 'user-1',
        type: NotificationType.EMAIL,
        title: 'Test Notification',
        message: 'Test message',
      };

      const mockNotification = {
        id: 'notification-1',
        ...dto,
        status: NotificationStatus.PENDING,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);
      mockQueue.add.mockResolvedValue({});

      const result = await service.send(dto);

      expect(mockNotificationRepository.create).toHaveBeenCalled();
      expect(mockNotificationRepository.save).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          notificationId: mockNotification.id,
          ...dto,
        }),
        expect.any(Object),
      );
      expect(result).toEqual(mockNotification);
    });

    it('should mark as failed if queue add fails', async () => {
      const dto = {
        userId: 'user-1',
        type: NotificationType.EMAIL,
        title: 'Test Notification',
        message: 'Test message',
      };

      const mockNotification = {
        id: 'notification-1',
        ...dto,
        status: NotificationStatus.PENDING,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(service.send(dto)).rejects.toThrow('Queue error');

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.FAILED,
        }),
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const userId = 'user-1';
      const mockNotifications = [
        {
          id: 'notification-1',
          user_id: userId,
          title: 'Test 1',
          is_read: false,
        },
        {
          id: 'notification-2',
          user_id: userId,
          title: 'Test 2',
          is_read: true,
        },
      ];

      mockNotificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.getUserNotifications(userId, 50);

      expect(mockNotificationRepository.find).toHaveBeenCalledWith({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
        take: 50,
      });
      expect(result).toEqual(mockNotifications);
    });
  });
});

