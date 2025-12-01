/**
 * Enum defining all possible features that can be enabled in a room
 * Each feature corresponds to a specific module that can be composed
 */
export enum RoomFeature {
  // ============================================
  // CORE FEATURES (Always available)
  // ============================================
  
  /** Audio communication */
  AUDIO = 'audio',
  
  /** Video communication */
  VIDEO = 'video',
  
  /** Screen sharing capability */
  SCREEN_SHARE = 'screen_share',
  
  /** Display list of participants */
  PARTICIPANT_LIST = 'participant_list',
  
  // ============================================
  // INTERACTIVE FEATURES (Optional)
  // ============================================
  
  /** Text chat messaging */
  CHAT = 'chat',
  
  /** Synchronized YouTube video playback */
  YOUTUBE_SYNC = 'youtube_sync',
  
  /** Raise hand to request attention */
  HAND_RAISE = 'hand_raise',
  
  /** Send emoji reactions */
  REACTIONS = 'reactions',
  
  /** Create and respond to polls */
  POLLS = 'polls',
  
  /** Collaborative whiteboard */
  WHITEBOARD = 'whiteboard',
  
  /** File sharing capability */
  FILE_SHARING = 'file_sharing',
  
  // ============================================
  // MODERATION FEATURES (Host controls)
  // ============================================
  
  /** Waiting room for participant approval */
  WAITING_ROOM = 'waiting_room',
  
  /** Ability to remove participants */
  KICK_USER = 'kick_user',
  
  /** Host can mute/unmute participants */
  MUTE_CONTROL = 'mute_control',
  
  /** Host can block users from joining */
  BLOCK_USER = 'block_user',
  
  /** Host can lock/unlock room */
  ROOM_LOCK = 'room_lock',
  
  // ============================================
  // PREMIUM FEATURES
  // ============================================
  
  /** Record meeting sessions */
  RECORDING = 'recording',
  
  /** Analytics and engagement tracking */
  ANALYTICS = 'analytics',
}

