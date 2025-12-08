import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { P2PPeerConnectionManager } from '../p2p-peer-connection-manager';
import { createMockSocket, createMockMediaStream } from '../../../../tests/utils/webrtc-test-utils';

describe('P2PPeerConnectionManager', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let manager: P2PPeerConnectionManager;
  const meetingId = 'test-meeting-1';
  const userId = 'test-user-1';

  beforeEach(async () => {
    mockSocket = createMockSocket();
    manager = new P2PPeerConnectionManager({
      socket: mockSocket as any,
      meetingId,
      userId,
    });
    await manager.initialize();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(manager.isReady()).toBe(true);
    });

    it('should setup socket listeners for signaling events', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('media:offer', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('media:answer', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('media:ice-candidate', expect.any(Function));
    });
  });

  describe('determineIsPolite', () => {
    it('should determine isPolite correctly using lexicographic comparison', () => {
      // User "user-2" > "user-1" → isPolite = true
      expect(P2PPeerConnectionManager.determineIsPolite('user-2', 'user-1')).toBe(true);
      
      // User "user-1" < "user-2" → isPolite = false
      expect(P2PPeerConnectionManager.determineIsPolite('user-1', 'user-2')).toBe(false);
      
      // Same user → should be consistent (user-1 < user-10 alphabetically)
      expect(P2PPeerConnectionManager.determineIsPolite('user-1', 'user-10')).toBe(false);
      expect(P2PPeerConnectionManager.determineIsPolite('user-10', 'user-1')).toBe(true);
    });

    it('should be consistent (same peer is always polite on both sides)', () => {
      const userA = 'user-a';
      const userB = 'user-b';
      
      // User A's perspective
      const isPoliteA = P2PPeerConnectionManager.determineIsPolite(userA, userB);
      
      // User B's perspective (should be opposite)
      const isPoliteB = P2PPeerConnectionManager.determineIsPolite(userB, userA);
      
      // One should be true, one should be false
      expect(isPoliteA).not.toBe(isPoliteB);
      
      // If A is polite, B is not (and vice versa)
      expect(isPoliteA || isPoliteB).toBe(true);
      expect(isPoliteA && isPoliteB).toBe(false);
    });
  });

  describe('getOrCreatePeerConnection', () => {
    it('should create new peer connection', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      const pc = manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        localStream,
      });

      expect(pc).toBeDefined();
      expect(pc.createOffer).toBeDefined();
      expect(pc.createAnswer).toBeDefined();
      expect(manager.getPeerConnectionInfo('user-2')).not.toBeNull();
    });

    it('should return existing connection if not closed', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      const pc1 = manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        localStream,
      });

      const pc2 = manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        localStream,
      });

      expect(pc1).toBe(pc2); // Same instance
    });

    it('should use determined isPolite if not provided', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        localStream,
      });

      const peerInfo = manager.getPeerConnectionInfo('user-2');
      expect(peerInfo).not.toBeNull();
      // user-1 < user-2 → isPolite = false
      expect(peerInfo?.isPolite).toBe(false);
    });

    it('should use provided isPolite if specified', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        isPolite: true,
        localStream,
      });

      const peerInfo = manager.getPeerConnectionInfo('user-2');
      expect(peerInfo?.isPolite).toBe(true);
    });
  });

  describe('closePeerConnection', () => {
    it('should close peer connection', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        localStream,
      });

      expect(manager.getPeerConnectionInfo('user-2')).not.toBeNull();

      manager.closePeerConnection('user-2');

      expect(manager.getPeerConnectionInfo('user-2')).toBeNull();
    });

    it('should clear negotiation queue when closing', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.getOrCreatePeerConnection({
        targetUserId: 'user-2',
        localStream,
      });

      const peerInfo = manager.getPeerConnectionInfo('user-2');
      expect(peerInfo).not.toBeNull();

      // Add a task to queue (simulate)
      if (peerInfo) {
        peerInfo.negotiationQueue.push({
          id: 'test-task',
          type: 'offer',
          priority: 0,
          resolve: vi.fn(),
          reject: vi.fn(),
          createdAt: Date.now(),
        });
        expect(peerInfo.negotiationQueue.length).toBe(1);
      }

      manager.closePeerConnection('user-2');

      // Queue should be cleared
      expect(manager.getPeerConnectionInfo('user-2')).toBeNull();
    });
  });

  describe('getAllPeerConnections', () => {
    it('should return all active peer connections', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      
      manager.getOrCreatePeerConnection({ targetUserId: 'user-2', localStream });
      manager.getOrCreatePeerConnection({ targetUserId: 'user-3', localStream });

      const connections = manager.getAllPeerConnections();
      expect(connections.size).toBe(2);
      expect(connections.has('user-2')).toBe(true);
      expect(connections.has('user-3')).toBe(true);
    });

    it('should not return closed connections', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      
      manager.getOrCreatePeerConnection({ targetUserId: 'user-2', localStream });
      manager.closePeerConnection('user-2');

      const connections = manager.getAllPeerConnections();
      expect(connections.size).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all peer connections', () => {
      const localStream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      
      manager.getOrCreatePeerConnection({ targetUserId: 'user-2', localStream });
      manager.getOrCreatePeerConnection({ targetUserId: 'user-3', localStream });

      expect(manager.getAllPeerConnections().size).toBe(2);

      manager.cleanup();

      expect(manager.getAllPeerConnections().size).toBe(0);
      expect(manager.isReady()).toBe(false);
    });
  });
});

