/**
 * Enum defining user permissions in the system
 */
export enum Permission {
  // Room permissions
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  CREATE_ROOM = 'create_room',
  DELETE_ROOM = 'delete_room',
  
  // Participant permissions
  MUTE_PARTICIPANT = 'mute_participant',
  KICK_PARTICIPANT = 'kick_participant',
  BLOCK_PARTICIPANT = 'block_participant',
  
  // Feature permissions
  ENABLE_FEATURE = 'enable_feature',
  DISABLE_FEATURE = 'disable_feature',
  
  // Moderation permissions
  MODERATE_CHAT = 'moderate_chat',
  MODERATE_ROOM = 'moderate_room',
  
  // Recording permissions
  START_RECORDING = 'start_recording',
  STOP_RECORDING = 'stop_recording',
  
  // Admin permissions
  ADMIN_ACCESS = 'admin_access',
}

