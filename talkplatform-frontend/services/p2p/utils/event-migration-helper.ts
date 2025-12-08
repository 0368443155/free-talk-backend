import { Socket } from 'socket.io-client';

/**
 * Helper to migrate from old events to new events
 * Provides backward compatibility during migration period
 * 
 * This class uses Adapter Pattern to abstract event emission,
 * supporting both old and new gateway events based on feature flag.
 * 
 * ⚠️ TODO: REMOVE AFTER 2025-01-31
 * Once migration is complete and all users are on new gateway,
 * remove this helper and use new events directly.
 */
export class EventMigrationHelper {
  constructor(
    private socket: Socket,
    private meetingId: string,
    private useNewGateway: boolean
  ) {}

  /**
   * Emit ready event (webrtc:ready -> media:ready)
   */
  emitReady(userId: string): void {
    if (this.useNewGateway) {
      this.socket.emit('media:ready', { roomId: this.meetingId, userId });
    } else {
      this.socket.emit('webrtc:ready', { userId });
    }
  }

  /**
   * Emit offer (webrtc:offer -> media:offer)
   */
  emitOffer(targetUserId: string, offer: RTCSessionDescriptionInit): void {
    if (this.useNewGateway) {
      this.socket.emit('media:offer', {
        roomId: this.meetingId,
        targetUserId,
        offer,
      });
    } else {
      // Old format: fromUserId/toUserId instead of targetUserId
      this.socket.emit('webrtc:offer', {
        targetUserId,
        offer,
      });
    }
  }

  /**
   * Emit answer (webrtc:answer -> media:answer)
   */
  emitAnswer(targetUserId: string, answer: RTCSessionDescriptionInit): void {
    if (this.useNewGateway) {
      this.socket.emit('media:answer', {
        roomId: this.meetingId,
        targetUserId,
        answer,
      });
    } else {
      // Old format
      this.socket.emit('webrtc:answer', {
        targetUserId,
        answer,
      });
    }
  }

  /**
   * Emit ICE candidate (webrtc:ice-candidate -> media:ice-candidate)
   */
  emitIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit): void {
    if (this.useNewGateway) {
      this.socket.emit('media:ice-candidate', {
        roomId: this.meetingId,
        targetUserId,
        candidate,
      });
    } else {
      // Old format
      this.socket.emit('webrtc:ice-candidate', {
        targetUserId,
        candidate,
      });
    }
  }

  /**
   * Emit toggle mic (toggle-audio -> media:toggle-mic)
   */
  emitToggleMic(isMuted: boolean): void {
    if (this.useNewGateway) {
      this.socket.emit('media:toggle-mic', { isMuted });
    } else {
      // Old format: enabled instead of isMuted
      this.socket.emit('toggle-audio', { enabled: !isMuted });
    }
  }

  /**
   * Emit toggle video (toggle-video -> media:toggle-video)
   */
  emitToggleVideo(isVideoOff: boolean): void {
    if (this.useNewGateway) {
      this.socket.emit('media:toggle-video', { isVideoOff });
    } else {
      // Old format: enabled instead of isVideoOff
      this.socket.emit('toggle-video', { enabled: !isVideoOff });
    }
  }

  /**
   * Emit screen share (screen-share -> media:screen-share)
   */
  emitScreenShare(isSharing: boolean): void {
    if (this.useNewGateway) {
      this.socket.emit('media:screen-share', { isSharing });
    } else {
      // Old format: enabled instead of isSharing
      this.socket.emit('screen-share', { enabled: isSharing });
    }
  }
}
