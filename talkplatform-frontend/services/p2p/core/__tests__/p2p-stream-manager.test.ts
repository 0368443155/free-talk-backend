import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { P2PStreamManager } from '../p2p-stream-manager';
import { createMockSocket, createMockMediaStream } from '../../../../tests/utils/webrtc-test-utils';

describe('P2PStreamManager', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let manager: P2PStreamManager;
  const meetingId = 'test-meeting-1';
  const userId = 'test-user-1';

  beforeEach(async () => {
    mockSocket = createMockSocket();
    manager = new P2PStreamManager({
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

    it('should have zero streams initially', () => {
      expect(manager.getStreamCount()).toBe(0);
    });
  });

  describe('addRemoteStream', () => {
    it('should add remote stream', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.addRemoteStream('user-2', stream);

      expect(manager.getStreamCount()).toBe(1);
      expect(manager.getRemoteStream('user-2')).toBe(stream);
    });

    it('should update existing stream', () => {
      const stream1 = createMockMediaStream({ hasAudio: true, hasVideo: false });
      const stream2 = createMockMediaStream({ hasAudio: true, hasVideo: true });

      manager.addRemoteStream('user-2', stream1);
      expect(manager.getStreamCount()).toBe(1);

      manager.addRemoteStream('user-2', stream2);
      expect(manager.getStreamCount()).toBe(1);
      expect(manager.getRemoteStream('user-2')).toBe(stream2);
    });

    it('should extract audio and video tracks', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.addRemoteStream('user-2', stream);

      const streamInfo = manager.getRemoteStreamInfo('user-2');
      expect(streamInfo).not.toBeNull();
      expect(streamInfo?.audioTrack).not.toBeNull();
      expect(streamInfo?.videoTrack).not.toBeNull();
    });
  });

  describe('removeRemoteStream', () => {
    it('should remove remote stream', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.addRemoteStream('user-2', stream);

      expect(manager.getStreamCount()).toBe(1);

      manager.removeRemoteStream('user-2');

      expect(manager.getStreamCount()).toBe(0);
      expect(manager.getRemoteStream('user-2')).toBeNull();
    });

    it('should stop tracks when removing stream', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      manager.addRemoteStream('user-2', stream);

      const stopSpy = vi.spyOn(audioTrack, 'stop');
      manager.removeRemoteStream('user-2');

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should not throw if stream does not exist', () => {
      expect(() => manager.removeRemoteStream('non-existent')).not.toThrow();
    });
  });

  describe('getRemoteStream', () => {
    it('should return stream if exists', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.addRemoteStream('user-2', stream);

      expect(manager.getRemoteStream('user-2')).toBe(stream);
    });

    it('should return null if stream does not exist', () => {
      expect(manager.getRemoteStream('non-existent')).toBeNull();
    });
  });

  describe('getAllRemoteStreams', () => {
    it('should return all streams', () => {
      const stream1 = createMockMediaStream({ hasAudio: true, hasVideo: true });
      const stream2 = createMockMediaStream({ hasAudio: true, hasVideo: false });

      manager.addRemoteStream('user-2', stream1);
      manager.addRemoteStream('user-3', stream2);

      const allStreams = manager.getAllRemoteStreams();
      expect(allStreams.size).toBe(2);
      expect(allStreams.get('user-2')).toBe(stream1);
      expect(allStreams.get('user-3')).toBe(stream2);
    });
  });

  describe('hasActiveStream', () => {
    it('should return true if stream has active tracks', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.addRemoteStream('user-2', stream);

      expect(manager.hasActiveStream('user-2')).toBe(true);
    });

    it('should return false if stream does not exist', () => {
      expect(manager.hasActiveStream('non-existent')).toBe(false);
    });
  });

  describe('handleTrackEnded', () => {
    it('should remove track from stream info when track ends', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      manager.addRemoteStream('user-2', stream);

      const streamInfo = manager.getRemoteStreamInfo('user-2');
      const audioTrack = streamInfo?.audioTrack;
      
      expect(audioTrack).not.toBeNull();

      if (audioTrack) {
        manager.handleTrackEnded('user-2', audioTrack);
        
        const updatedInfo = manager.getRemoteStreamInfo('user-2');
        expect(updatedInfo?.audioTrack).toBeNull();
      }
    });

    it('should remove stream if no active tracks remain', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: false });
      manager.addRemoteStream('user-2', stream);

      const streamInfo = manager.getRemoteStreamInfo('user-2');
      const audioTrack = streamInfo?.audioTrack;
      
      if (audioTrack) {
        // Simulate track ending
        manager.handleTrackEnded('user-2', audioTrack);
        
        expect(manager.getStreamCount()).toBe(0);
      }
    });
  });

  describe('cleanup', () => {
    it('should cleanup all streams', () => {
      const stream1 = createMockMediaStream({ hasAudio: true, hasVideo: true });
      const stream2 = createMockMediaStream({ hasAudio: true, hasVideo: false });

      manager.addRemoteStream('user-2', stream1);
      manager.addRemoteStream('user-3', stream2);

      expect(manager.getStreamCount()).toBe(2);

      manager.cleanup();

      expect(manager.getStreamCount()).toBe(0);
      expect(manager.isReady()).toBe(false);
    });

    it('should stop all tracks during cleanup', () => {
      const stream = createMockMediaStream({ hasAudio: true, hasVideo: true });
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      manager.addRemoteStream('user-2', stream);

      const audioStopSpy = vi.spyOn(audioTrack, 'stop');
      const videoStopSpy = vi.spyOn(videoTrack, 'stop');

      manager.cleanup();

      expect(audioStopSpy).toHaveBeenCalled();
      expect(videoStopSpy).toHaveBeenCalled();
    });
  });
});

