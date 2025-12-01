import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('Media Gateway (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let client1: Socket;
  let client2: Socket;
  const testRoomId = 'test-room-123';
  const testUserId1 = 'user-1';
  const testUserId2 = 'user-2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get the WebSocket server
    server = app.getHttpServer() as any;
  });

  beforeEach((done) => {
    // Create two client connections
    client1 = io('http://localhost:3000/media', {
      auth: {
        token: 'mock-token-1',
      },
      transports: ['websocket'],
    });

    client2 = io('http://localhost:3000/media', {
      auth: {
        token: 'mock-token-2',
      },
      transports: ['websocket'],
    });

    client1.on('connect', () => {
      client2.on('connect', () => {
        done();
      });
    });
  });

  afterEach((done) => {
    if (client1.connected) {
      client1.disconnect();
    }
    if (client2.connected) {
      client2.disconnect();
    }
    done();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WebRTC Signaling Flow', () => {
    it('should establish WebRTC connection between two users', (done) => {
      const offerData = {
        type: 'offer',
        sdp: 'test-offer-sdp',
      };

      const answerData = {
        type: 'answer',
        sdp: 'test-answer-sdp',
      };

      // Client 2 listens for offer
      client2.on('media:offer', (data) => {
        expect(data.fromUserId).toBe(testUserId1);
        expect(data.roomId).toBe(testRoomId);
        expect(data.offer.type).toBe('offer');
        expect(data.offer.sdp).toBe('test-offer-sdp');

        // Client 2 sends answer
        client2.emit('media:answer', {
          roomId: testRoomId,
          targetUserId: testUserId1,
          answer: answerData,
        });
      });

      // Client 1 listens for answer
      client1.on('media:answer', (data) => {
        expect(data.fromUserId).toBe(testUserId2);
        expect(data.roomId).toBe(testRoomId);
        expect(data.answer.type).toBe('answer');
        expect(data.answer.sdp).toBe('test-answer-sdp');

        done();
      });

      // Client 1 sends offer
      client1.emit('media:offer', {
        roomId: testRoomId,
        targetUserId: testUserId2,
        offer: offerData,
      });
    });

    it('should forward ICE candidates between users', (done) => {
      let candidateCount = 0;
      const expectedCandidates = 2;

      client2.on('media:ice-candidate', (data) => {
        expect(data.fromUserId).toBe(testUserId1);
        expect(data.roomId).toBe(testRoomId);
        expect(data.candidate).toBeDefined();

        candidateCount++;
        if (candidateCount === expectedCandidates) {
          done();
        }
      });

      // Client 1 sends multiple ICE candidates
      const candidate1 = {
        candidate: 'candidate:1',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      const candidate2 = {
        candidate: 'candidate:2',
        sdpMLineIndex: 0,
        sdpMid: '0',
      };

      client1.emit('media:ice-candidate', {
        roomId: testRoomId,
        targetUserId: testUserId2,
        candidate: candidate1,
      });

      setTimeout(() => {
        client1.emit('media:ice-candidate', {
          roomId: testRoomId,
          targetUserId: testUserId2,
          candidate: candidate2,
        });
      }, 100);
    });

    it('should broadcast peer-ready event to room', (done) => {
      client2.on('media:peer-ready', (data) => {
        expect(data.userId).toBe(testUserId1);
        expect(data.roomId).toBe(testRoomId);
        done();
      });

      // Client 1 announces ready
      client1.emit('media:ready', {
        roomId: testRoomId,
      });
    });
  });

  describe('Media Control Events', () => {
    it('should toggle microphone and broadcast to room', (done) => {
      client2.on('media:user-muted', (data) => {
        expect(data.userId).toBe(testUserId1);
        expect(data.isMuted).toBe(true);
        done();
      });

      client1.emit('media:toggle-mic', {
        isMuted: true,
      });
    });

    it('should toggle video and broadcast to room', (done) => {
      client2.on('media:user-video-off', (data) => {
        expect(data.userId).toBe(testUserId1);
        expect(data.isVideoOff).toBe(true);
        done();
      });

      client1.emit('media:toggle-video', {
        isVideoOff: true,
      });
    });

    it('should handle screen share and broadcast to room', (done) => {
      client2.on('media:user-screen-share', (data) => {
        expect(data.userId).toBe(testUserId1);
        expect(data.isSharing).toBe(true);
        expect(data.timestamp).toBeDefined();
        done();
      });

      client1.emit('media:screen-share', {
        isSharing: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle offer when media feature is disabled', (done) => {
      client1.on('exception', (error) => {
        expect(error.message).toContain('Media is disabled');
        done();
      });

      // Try to send offer to a room without media feature
      client1.emit('media:offer', {
        roomId: 'room-without-media',
        targetUserId: testUserId2,
        offer: { type: 'offer', sdp: 'test' },
      });
    });

    it('should handle offer when user not authenticated', (done) => {
      const unauthenticatedClient = io('http://localhost:3000/media', {
        transports: ['websocket'],
      });

      unauthenticatedClient.on('connect', () => {
        unauthenticatedClient.on('exception', (error) => {
          expect(error.message).toContain('not authenticated');
          unauthenticatedClient.disconnect();
          done();
        });

        unauthenticatedClient.emit('media:offer', {
          roomId: testRoomId,
          targetUserId: testUserId2,
          offer: { type: 'offer', sdp: 'test' },
        });
      });
    });
  });
});

