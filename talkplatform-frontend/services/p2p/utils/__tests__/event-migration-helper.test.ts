import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventMigrationHelper } from '../event-migration-helper';
import { createMockSocket } from '../../../../tests/utils/webrtc-test-utils';

describe('EventMigrationHelper', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  const meetingId = 'meeting-1';

  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.clearAllMocks();
  });

  describe('New Gateway (useNewGateway = true)', () => {
    it('should emit media:ready with roomId', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      helper.emitReady('user-1');

      expect(mockSocket.emit).toHaveBeenCalledWith('media:ready', {
        roomId: meetingId,
        userId: 'user-1',
      });
      expect(mockSocket.emit).not.toHaveBeenCalledWith('webrtc:ready', expect.any(Object));
    });

    it('should emit media:offer with new format', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      const offer = { type: 'offer' as const, sdp: 'mock-sdp' };

      helper.emitOffer('user-2', offer);

      expect(mockSocket.emit).toHaveBeenCalledWith('media:offer', {
        roomId: meetingId,
        targetUserId: 'user-2',
        offer,
      });
    });

    it('should emit media:toggle-mic with isMuted', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      helper.emitToggleMic(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('media:toggle-mic', {
        isMuted: true,
      });
    });

    it('should emit media:toggle-video with isVideoOff', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      helper.emitToggleVideo(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('media:toggle-video', {
        isVideoOff: true,
      });
    });

    it('should emit media:screen-share with isSharing', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      helper.emitScreenShare(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('media:screen-share', {
        isSharing: true,
      });
    });
  });

  describe('Old Gateway (useNewGateway = false)', () => {
    it('should emit webrtc:ready without roomId', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      helper.emitReady('user-1');

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:ready', {
        userId: 'user-1',
      });
      expect(mockSocket.emit).not.toHaveBeenCalledWith('media:ready', expect.any(Object));
    });

    it('should emit webrtc:offer with old format', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      const offer = { type: 'offer' as const, sdp: 'mock-sdp' };

      helper.emitOffer('user-2', offer);

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:offer', {
        targetUserId: 'user-2',
        offer,
      });
    });

    it('should emit toggle-audio with enabled (inverted isMuted)', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      helper.emitToggleMic(true); // isMuted = true

      expect(mockSocket.emit).toHaveBeenCalledWith('toggle-audio', {
        enabled: false, // !isMuted
      });
    });

    it('should emit toggle-video with enabled (inverted isVideoOff)', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      helper.emitToggleVideo(true); // isVideoOff = true

      expect(mockSocket.emit).toHaveBeenCalledWith('toggle-video', {
        enabled: false, // !isVideoOff
      });
    });

    it('should emit screen-share with enabled', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      helper.emitScreenShare(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('screen-share', {
        enabled: true,
      });
    });
  });

  describe('ICE Candidate', () => {
    it('should emit media:ice-candidate with new format', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      const candidate = { candidate: 'mock-candidate', sdpMLineIndex: 0 };

      helper.emitIceCandidate('user-2', candidate);

      expect(mockSocket.emit).toHaveBeenCalledWith('media:ice-candidate', {
        roomId: meetingId,
        targetUserId: 'user-2',
        candidate,
      });
    });

    it('should emit webrtc:ice-candidate with old format', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      const candidate = { candidate: 'mock-candidate', sdpMLineIndex: 0 };

      helper.emitIceCandidate('user-2', candidate);

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:ice-candidate', {
        targetUserId: 'user-2',
        candidate,
      });
    });
  });

  describe('Answer', () => {
    it('should emit media:answer with new format', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, true);
      const answer = { type: 'answer' as const, sdp: 'mock-sdp' };

      helper.emitAnswer('user-2', answer);

      expect(mockSocket.emit).toHaveBeenCalledWith('media:answer', {
        roomId: meetingId,
        targetUserId: 'user-2',
        answer,
      });
    });

    it('should emit webrtc:answer with old format', () => {
      const helper = new EventMigrationHelper(mockSocket as any, meetingId, false);
      const answer = { type: 'answer' as const, sdp: 'mock-sdp' };

      helper.emitAnswer('user-2', answer);

      expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:answer', {
        targetUserId: 'user-2',
        answer,
      });
    });
  });
});

