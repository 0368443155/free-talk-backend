import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediaGateway } from './media.gateway';
import { AudioControlService } from '../services/audio-control.service';
import { VideoControlService } from '../services/video-control.service';
import { ScreenShareService } from '../services/screen-share.service';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFactoryService } from '../../../../core/room/services/room-factory.service';
import { RoomStateManagerService } from '../../../../core/room/services/room-state-manager.service';
import { UserSocketManagerService } from '../../../../core/room/services/user-socket-manager.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Meeting } from '../../../meeting/entities/meeting.entity';
import { Repository } from 'typeorm';

interface SocketWithUser extends Socket {
  data: {
    userId?: string;
    username?: string;
    roomId?: string;
  };
  user?: any;
  userId?: string;
  meetingId?: string;
  id: string;
}

describe('MediaGateway', () => {
  let gateway: MediaGateway;
  let mockServer: Partial<Server>;
  let mockClient: Partial<SocketWithUser>;
  let userSocketManager: jest.Mocked<UserSocketManagerService>;
  let roomFactory: jest.Mocked<RoomFactoryService>;
  let roomStateManager: jest.Mocked<RoomStateManagerService>;
  let meetingRepository: jest.Mocked<Repository<Meeting>>;

  beforeEach(async () => {
    // Mock Server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      except: jest.fn().mockReturnThis(),
    };

    // Mock Client
    mockClient = {
      id: 'socket-123',
      data: {
        userId: 'user-1',
        username: 'test-user',
      },
      userId: 'user-1',
      meetingId: 'room-123',
      emit: jest.fn(),
    };

    // Mock UserSocketManagerService
    userSocketManager = {
      trackUserSocket: jest.fn().mockResolvedValue(undefined),
      removeUserSocket: jest.fn().mockResolvedValue(undefined),
      getUserSocket: jest.fn().mockResolvedValue('socket-456'),
    } as any;

    // Mock RoomFactoryService
    roomFactory = {
      getRoomConfigByType: jest.fn().mockReturnValue({
        features: [RoomFeature.VIDEO, RoomFeature.AUDIO],
      }),
    } as any;

    // Mock RoomStateManagerService
    roomStateManager = {
      updateParticipant: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Meeting Repository
    meetingRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'room-123',
        meeting_type: 'teacher_class',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaGateway,
        {
          provide: UserSocketManagerService,
          useValue: userSocketManager,
        },
        {
          provide: RoomFactoryService,
          useValue: roomFactory,
        },
        {
          provide: RoomStateManagerService,
          useValue: roomStateManager,
        },
        {
          provide: AudioControlService,
          useValue: {
            toggleMic: jest.fn().mockResolvedValue(undefined),
            getMuteState: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: VideoControlService,
          useValue: {
            toggleVideo: jest.fn().mockResolvedValue(undefined),
            getVideoState: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: ScreenShareService,
          useValue: {
            startScreenShare: jest.fn().mockResolvedValue(undefined),
            stopScreenShare: jest.fn().mockResolvedValue(undefined),
            forceStopScreenShare: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: BaseRoomService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: meetingRepository,
        },
      ],
    }).compile();

    gateway = module.get<MediaGateway>(MediaGateway);
    gateway.server = mockServer as Server;
  });

  describe('handleOffer', () => {
    it('should forward offer to target user', async () => {
      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        offer: { type: 'offer' as const, sdp: 'test-sdp' },
      };

      const result = await gateway.handleOffer(mockClient as SocketWithUser, data);

      expect(userSocketManager.getUserSocket).toHaveBeenCalledWith('user-2', 'media');
      expect(mockServer.to).toHaveBeenCalledWith('socket-456');
      expect(mockServer.emit).toHaveBeenCalledWith('media:offer', {
        fromUserId: 'user-1',
        roomId: 'room-123',
        offer: data.offer,
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw error if user not authenticated', async () => {
      const unauthenticatedClient = {
        ...mockClient,
        data: {},
        userId: undefined,
      };

      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        offer: { type: 'offer' as const, sdp: 'test-sdp' },
      };

      await expect(
        gateway.handleOffer(unauthenticatedClient as SocketWithUser, data),
      ).rejects.toThrow(WsException);
    });

    it('should throw error if media feature is disabled', async () => {
      roomFactory.getRoomConfigByType = jest.fn().mockReturnValue({
        features: [RoomFeature.AUDIO], // No VIDEO feature
      });

      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        offer: { type: 'offer' as const, sdp: 'test-sdp' },
      };

      await expect(
        gateway.handleOffer(mockClient as SocketWithUser, data),
      ).rejects.toThrow('Media is disabled in this room');
    });

    it('should track peer connection', async () => {
      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        offer: { type: 'offer' as const, sdp: 'test-sdp' },
      };

      await gateway.handleOffer(mockClient as SocketWithUser, data);

      // Verify peer connection is tracked (internal map)
      // This is tested indirectly through successful forwarding
      expect(mockServer.emit).toHaveBeenCalled();
    });
  });

  describe('handleAnswer', () => {
    it('should forward answer to target user', async () => {
      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        answer: { type: 'answer' as const, sdp: 'test-answer-sdp' },
      };

      const result = await gateway.handleAnswer(mockClient as SocketWithUser, data);

      expect(userSocketManager.getUserSocket).toHaveBeenCalledWith('user-2', 'media');
      expect(mockServer.to).toHaveBeenCalledWith('socket-456');
      expect(mockServer.emit).toHaveBeenCalledWith('media:answer', {
        fromUserId: 'user-1',
        roomId: 'room-123',
        answer: data.answer,
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw error if user not authenticated', async () => {
      const unauthenticatedClient = {
        ...mockClient,
        data: {},
        userId: undefined,
      };

      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        answer: { type: 'answer' as const, sdp: 'test-answer-sdp' },
      };

      await expect(
        gateway.handleAnswer(unauthenticatedClient as SocketWithUser, data),
      ).rejects.toThrow(WsException);
    });
  });

  describe('handleIceCandidate', () => {
    it('should forward ICE candidate to target user', async () => {
      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        candidate: {
          candidate: 'candidate:1',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
      };

      await gateway.handleIceCandidate(mockClient as SocketWithUser, data);

      expect(userSocketManager.getUserSocket).toHaveBeenCalledWith('user-2', 'media');
      expect(mockServer.to).toHaveBeenCalledWith('socket-456');
      expect(mockServer.emit).toHaveBeenCalledWith('media:ice-candidate', {
        fromUserId: 'user-1',
        roomId: 'room-123',
        candidate: data.candidate,
      });
    });

    it('should silently fail if user not authenticated (ICE candidates are frequent)', async () => {
      const unauthenticatedClient = {
        ...mockClient,
        data: {},
        userId: undefined,
      };

      const data = {
        roomId: 'room-123',
        targetUserId: 'user-2',
        candidate: {
          candidate: 'candidate:1',
          sdpMLineIndex: 0,
          sdpMid: '0',
        },
      };

      // Should not throw
      await expect(
        gateway.handleIceCandidate(unauthenticatedClient as SocketWithUser, data),
      ).resolves.not.toThrow();
    });
  });

  describe('handleReady', () => {
    it('should broadcast peer-ready event to room', async () => {
      const data = { roomId: 'room-123' };

      await gateway.handleReady(mockClient as SocketWithUser, data);

      expect(mockServer.to).toHaveBeenCalledWith('room-123');
      expect(mockServer.except).toHaveBeenCalledWith('socket-123');
      expect(mockServer.emit).toHaveBeenCalledWith('media:peer-ready', {
        userId: 'user-1',
        roomId: 'room-123',
      });
    });

    it('should return early if user not authenticated', async () => {
      const unauthenticatedClient = {
        ...mockClient,
        data: {},
        userId: undefined,
      };

      const data = { roomId: 'room-123' };

      await gateway.handleReady(unauthenticatedClient as SocketWithUser, data);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should return early if roomId not provided', async () => {
      const data = { roomId: '' };

      await gateway.handleReady(mockClient as SocketWithUser, data);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleToggleMic', () => {
    it('should toggle mic and broadcast to room', async () => {
      const audioControl = gateway['audioControl'] as jest.Mocked<AudioControlService>;
      const data = { isMuted: true };

      await gateway.handleToggleMic(mockClient as SocketWithUser, data);

      expect(audioControl.toggleMic).toHaveBeenCalledWith('room-123', 'user-1', true);
      expect(mockServer.to).toHaveBeenCalledWith('room-123');
      expect(mockServer.emit).toHaveBeenCalledWith('media:user-muted', {
        userId: 'user-1',
        isMuted: true,
      });
    });

    it('should return early if meetingId or userId not provided', async () => {
      const invalidClient = {
        ...mockClient,
        meetingId: undefined,
        userId: undefined,
      };

      const data = { isMuted: true };

      await gateway.handleToggleMic(invalidClient as SocketWithUser, data);

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleToggleVideo', () => {
    it('should toggle video and broadcast to room', async () => {
      const videoControl = gateway['videoControl'] as jest.Mocked<VideoControlService>;
      const data = { isVideoOff: true };

      await gateway.handleToggleVideo(mockClient as SocketWithUser, data);

      expect(videoControl.toggleVideo).toHaveBeenCalledWith('room-123', 'user-1', true);
      expect(mockServer.to).toHaveBeenCalledWith('room-123');
      expect(mockServer.emit).toHaveBeenCalledWith('media:user-video-off', {
        userId: 'user-1',
        isVideoOff: true,
      });
    });
  });

  describe('handleScreenShare', () => {
    it('should start screen share and broadcast to room', async () => {
      const screenShare = gateway['screenShare'] as jest.Mocked<ScreenShareService>;
      const data = { isSharing: true };

      await gateway.handleScreenShare(mockClient as SocketWithUser, data);

      expect(screenShare.startScreenShare).toHaveBeenCalledWith('room-123', 'user-1');
      expect(mockServer.to).toHaveBeenCalledWith('room-123');
      expect(mockServer.emit).toHaveBeenCalledWith('media:user-screen-share', {
        userId: 'user-1',
        isSharing: true,
        timestamp: expect.any(Date),
      });
    });

    it('should stop screen share and broadcast to room', async () => {
      const screenShare = gateway['screenShare'] as jest.Mocked<ScreenShareService>;
      const data = { isSharing: false };

      await gateway.handleScreenShare(mockClient as SocketWithUser, data);

      expect(screenShare.stopScreenShare).toHaveBeenCalledWith('room-123', 'user-1');
      expect(mockServer.to).toHaveBeenCalledWith('room-123');
      expect(mockServer.emit).toHaveBeenCalledWith('media:user-screen-share', {
        userId: 'user-1',
        isSharing: false,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('trackUserSocket and removeUserSocket', () => {
    it('should track user socket', async () => {
      await gateway.trackUserSocket('user-1', 'socket-123');

      expect(userSocketManager.trackUserSocket).toHaveBeenCalledWith(
        'user-1',
        'socket-123',
        'media',
      );
    });

    it('should remove user socket tracking', async () => {
      await gateway.removeUserSocket('user-1');

      expect(userSocketManager.removeUserSocket).toHaveBeenCalledWith('user-1', 'media');
    });
  });
});

