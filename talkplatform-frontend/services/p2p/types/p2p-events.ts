/**
 * WebRTC Signaling Events
 */
export interface MediaOfferEvent {
  roomId: string;
  targetUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface MediaAnswerEvent {
  roomId: string;
  targetUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface MediaIceCandidateEvent {
  roomId: string;
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface MediaReadyEvent {
  roomId: string;
  userId: string;
}

/**
 * Media Control Events
 */
export interface MediaToggleMicEvent {
  isMuted: boolean;
}

export interface MediaToggleVideoEvent {
  isVideoOff: boolean;
}

export interface MediaScreenShareEvent {
  isSharing: boolean;
}

/**
 * Admin Moderation Events
 */
export interface AdminMuteUserEvent {
  targetUserId: string;
  mute: boolean;
}

export interface AdminVideoOffUserEvent {
  targetUserId: string;
  videoOff: boolean;
}

export interface AdminKickUserEvent {
  targetUserId: string;
  reason?: string;
}

/**
 * Room Events
 */
export interface RoomJoinEvent {
  roomId: string;
  userId: string;
}

export interface RoomLeaveEvent {
  roomId: string;
  userId: string;
}

export interface RoomRequestPeersEvent {
  roomId: string;
}

/**
 * Event Handlers Type
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface P2PEventHandlers {
  // Media events
  'media:offer': EventHandler<MediaOfferEvent>;
  'media:answer': EventHandler<MediaAnswerEvent>;
  'media:ice-candidate': EventHandler<MediaIceCandidateEvent>;
  'media:ready': EventHandler<MediaReadyEvent>;
  'media:toggle-mic': EventHandler<MediaToggleMicEvent>;
  'media:toggle-video': EventHandler<MediaToggleVideoEvent>;
  'media:screen-share': EventHandler<MediaScreenShareEvent>;
  
  // Admin events
  'admin:mute-user': EventHandler<AdminMuteUserEvent>;
  'admin:video-off-user': EventHandler<AdminVideoOffUserEvent>;
  'admin:kick-user': EventHandler<AdminKickUserEvent>;
  
  // Room events
  'room:join': EventHandler<RoomJoinEvent>;
  'room:leave': EventHandler<RoomLeaveEvent>;
  'room:request-peers': EventHandler<RoomRequestPeersEvent>;
}

