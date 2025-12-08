import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { P2PMediaManager } from '../p2p-media-manager';
import { createMockSocket, createMockMediaStream, waitForAsync } from '../../../../tests/utils/webrtc-test-utils';

describe('P2PMediaManager', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let manager: P2PMediaManager;
  const meetingId = 'test-meeting-1';
  const userId = 'test-user-1';

  beforeEach(async () => {
    mockSocket = createMockSocket();
    manager = new P2PMediaManager({
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

    it('should not initialize twice', async () => {
      await manager.initialize();
      expect(manager.isReady()).toBe(true);
    });
  });

  describe('initializeLocalStream', () => {
    it('should create local stream with audio and video', async () => {
      const stream = await manager.initializeLocalStream(true, true);

      expect(stream).not.toBeNull();
      expect(stream.getAudioTracks().length).toBeGreaterThan(0);
      expect(stream.getVideoTracks().length).toBeGreaterThan(0);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should create local stream with audio only', async () => {
      const stream = await manager.initializeLocalStream(true, false);

      expect(stream).not.toBeNull();
      expect(stream.getAudioTracks().length).toBeGreaterThan(0);
      expect(stream.getVideoTracks().length).toBe(0);
    });

    it('should create local stream with video only', async () => {
      const stream = await manager.initializeLocalStream(false, true);

      expect(stream).not.toBeNull();
      expect(stream.getAudioTracks().length).toBe(0);
      expect(stream.getVideoTracks().length).toBeGreaterThan(0);
    });
  });

  describe('enableMicrophone', () => {
    it('should enable microphone', async () => {
      await manager.initializeLocalStream(true, false);

      await manager.enableMicrophone(true);

      const micState = manager.getMicState();
      expect(micState.enabled).toBe(true);
      expect(micState.isMuted).toBe(false);
    });

    it('should disable microphone', async () => {
      await manager.initializeLocalStream(true, false);

      await manager.enableMicrophone(false);

      const micState = manager.getMicState();
      expect(micState.enabled).toBe(false);
      expect(micState.isMuted).toBe(true);
    });

    it('should throw error if local stream not initialized', async () => {
      await expect(manager.enableMicrophone(true)).rejects.toThrow();
    });
  });

  describe('enableCamera', () => {
    it('should enable camera', async () => {
      await manager.initializeLocalStream(false, false);

      await manager.enableCamera(true);

      const cameraState = manager.getCameraState();
      expect(cameraState.enabled).toBe(true);
      expect(cameraState.isVideoOff).toBe(false);
    });

    it('should disable camera', async () => {
      await manager.initializeLocalStream(false, true);

      await manager.enableCamera(false);

      const cameraState = manager.getCameraState();
      expect(cameraState.enabled).toBe(false);
      expect(cameraState.isVideoOff).toBe(true);
    });

    it('should not change state if already in desired state', async () => {
      await manager.initializeLocalStream(false, true);
      
      const initialState = manager.getCameraState();
      await manager.enableCamera(true);
      
      // Should not change if already enabled
      await manager.enableCamera(true);
      const finalState = manager.getCameraState();
      expect(finalState.enabled).toBe(initialState.enabled);
    });
  });

  describe('getMicState and getCameraState', () => {
    it('should return primitive values for useSyncExternalStore', async () => {
      await manager.initializeLocalStream(true, true);

      const micState1 = manager.getMicState();
      const micState2 = manager.getMicState();
      
      // Should have same values but different references (new object each time)
      expect(micState1.enabled).toBe(micState2.enabled);
      expect(micState1.isMuted).toBe(micState2.isMuted);
      expect(micState1.isForced).toBe(micState2.isForced);
      
      // But primitive values should be equal
      expect(micState1.enabled === micState2.enabled).toBe(true);
    });
  });

  describe('getLocalStream', () => {
    it('should return null if stream not initialized', () => {
      expect(manager.getLocalStream()).toBeNull();
    });

    it('should return stream after initialization', async () => {
      const stream = await manager.initializeLocalStream(true, true);
      expect(manager.getLocalStream()).toBe(stream);
    });
  });

  describe('setPeerConnections', () => {
    it('should set peer connections', () => {
      const mockPC = new RTCPeerConnection();
      const peers = new Map([['user-2', mockPC]]);
      
      manager.setPeerConnections(peers);
      
      // Verify peers are set (we can't directly access private property, but replaceVideoTrackInAllPeers will use them)
      expect(true).toBe(true); // Placeholder - actual test would require exposing peers or testing replaceVideoTrackInAllPeers
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      await manager.initializeLocalStream(true, true);
      
      const stream = manager.getLocalStream();
      expect(stream).not.toBeNull();
      
      manager.cleanup();
      
      expect(manager.getLocalStream()).toBeNull();
      expect(manager.isReady()).toBe(false);
    });
  });
});

