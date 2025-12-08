import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { P2PTrackStateSync } from '../p2p-track-state-sync';
import { createMockSocket } from '../../../../tests/utils/webrtc-test-utils';

describe('P2PTrackStateSync', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let manager: P2PTrackStateSync;
  const meetingId = 'test-meeting-1';
  const userId = 'test-user-1';

  beforeEach(async () => {
    mockSocket = createMockSocket();
    manager = new P2PTrackStateSync(
      {
        socket: mockSocket as any,
        meetingId,
        userId,
      },
      {
        syncInterval: 1000, // 1 second for testing
        conflictResolution: 'server-wins',
      }
    );
    await manager.initialize();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(manager.isReady()).toBe(true);
    });

    it('should setup socket listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('media:user-muted', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('media:user-video-off', expect.any(Function));
    });
  });

  describe('updateLastSyncedState', () => {
    it('should update last synced mic state', () => {
      manager.updateLastSyncedState('mic', true);
      const state = manager.getLastSyncedState();
      expect(state.isMuted).toBe(true);
    });

    it('should update last synced camera state', () => {
      manager.updateLastSyncedState('camera', true);
      const state = manager.getLastSyncedState();
      expect(state.isVideoOff).toBe(true);
    });
  });

  describe('getLastSyncedState', () => {
    it('should return initial state', () => {
      const state = manager.getLastSyncedState();
      expect(state.isMuted).toBeNull();
      expect(state.isVideoOff).toBeNull();
      expect(state.timestamp).toBe(0);
    });

    it('should return updated state', () => {
      manager.updateLastSyncedState('mic', true);
      manager.updateLastSyncedState('camera', false);

      const state = manager.getLastSyncedState();
      expect(state.isMuted).toBe(true);
      expect(state.isVideoOff).toBe(false);
      expect(state.timestamp).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup and stop periodic sync', () => {
      expect(manager.isReady()).toBe(true);
      
      manager.cleanup();
      
      expect(manager.isReady()).toBe(false);
    });
  });
});

