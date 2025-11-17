import axiosConfig from './axiosConfig';

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum ParticipantRole {
  HOST = 'host',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
}

export enum RoomStatus {
  EMPTY = 'empty',
  AVAILABLE = 'available',
  CROWDED = 'crowded',
  FULL = 'full',
}

export enum MeetingLevel {
  ALL = 'all',
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface IMeetingSettings {
  allow_screen_share?: boolean;
  allow_chat?: boolean;
  allow_reactions?: boolean;
  record_meeting?: boolean;
  waiting_room?: boolean;
  auto_record?: boolean;
  mute_on_join?: boolean;
}

export interface IMeeting {
  id: string;
  title: string;
  description?: string;
  classroom_id?: string;
  host_id: string;
  is_private: boolean;
  is_locked: boolean;
  status: MeetingStatus;
  scheduled_at?: Date;
  started_at?: Date;
  ended_at?: Date;
  max_participants: number;
  youtube_video_id?: string;
  youtube_current_time: number;
  youtube_is_playing: boolean;
  settings?: IMeetingSettings;
  recording_url?: string;
  total_participants: number;
  current_participants: number;
  language?: string;
  level?: MeetingLevel;
  topic?: string;
  room_status?: RoomStatus;
  allow_microphone?: boolean;
  participants_can_unmute?: boolean;
  blocked_users?: string[];
  created_at: Date;
  updated_at: Date;
  host?: any;
  participants?: IMeetingParticipant[];
}

export interface IMeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_video_off: boolean;
  is_screen_sharing: boolean;
  is_hand_raised: boolean;
  is_kicked: boolean;
  is_online: boolean;
  joined_at: Date;
  left_at?: Date;
  user?: any;
}

export interface ICreateMeeting {
  title: string;
  description?: string;
  is_private?: boolean;
  is_locked?: boolean;
  status?: MeetingStatus;
  scheduled_at?: string;
  max_participants?: number;
  youtube_video_id?: string;
  settings?: IMeetingSettings;
  language?: string;
  level?: MeetingLevel;
  topic?: string;
  allow_microphone?: boolean;
  participants_can_unmute?: boolean;
}

export interface IMeetingListResponse {
  data: IMeeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Get all meetings for a classroom
export const getMeetingsApi = async (classroomId: string, page = 1, limit = 10): Promise<IMeetingListResponse> => {
  const response = await axiosConfig.get(`classrooms/${classroomId}/meetings`, {
    params: { page, limit },
  });
  return response.data;
};

// Get meeting by ID
export const getMeetingApi = async (classroomId: string, meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.get(`classrooms/${classroomId}/meetings/${meetingId}`);
  return response.data;
};

// Create meeting
export const createMeetingApi = async (classroomId: string, data: ICreateMeeting): Promise<IMeeting> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings`, data);
  return response.data;
};

// Update meeting
export const updateMeetingApi = async (
  classroomId: string,
  meetingId: string,
  data: Partial<ICreateMeeting>
): Promise<IMeeting> => {
  const response = await axiosConfig.patch(`classrooms/${classroomId}/meetings/${meetingId}`, data);
  return response.data;
};

// Delete meeting
export const deleteMeetingApi = async (classroomId: string, meetingId: string): Promise<void> => {
  await axiosConfig.delete(`classrooms/${classroomId}/meetings/${meetingId}`);
};

// Start meeting
export const startMeetingApi = async (classroomId: string, meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/start`);
  return response.data;
};

// End meeting
export const endMeetingApi = async (classroomId: string, meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/end`);
  return response.data;
};

// Join meeting
export const joinMeetingApi = async (classroomId: string, meetingId: string): Promise<IMeetingParticipant> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/join`);
  return response.data;
};

// Leave meeting
export const leaveMeetingApi = async (classroomId: string, meetingId: string): Promise<void> => {
  await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/leave`);
};

// Lock meeting
export const lockMeetingApi = async (classroomId: string, meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/lock`);
  return response.data;
};

// Unlock meeting
export const unlockMeetingApi = async (classroomId: string, meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/unlock`);
  return response.data;
};

// General Meetings APIs (using /meetings endpoint)
// Get all meetings
export const getPublicMeetingsApi = async (page = 1, limit = 10): Promise<IMeetingListResponse> => {
  const response = await axiosConfig.get('public-meetings', {
    params: { page, limit },
  });
  return response.data;
};

// Create meeting
export const createPublicMeetingApi = async (data: ICreateMeeting): Promise<IMeeting> => {
  const response = await axiosConfig.post('public-meetings', data);
  return response.data;
};

// Get public meeting by ID
export const getPublicMeetingApi = async (meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.get(`public-meetings/${meetingId}`);
  return response.data;
};

// Update public meeting
export const updatePublicMeetingApi = async (
  meetingId: string,
  data: Partial<ICreateMeeting>
): Promise<IMeeting> => {
  const response = await axiosConfig.patch(`public-meetings/${meetingId}`, data);
  return response.data;
};

// Delete public meeting
export const deletePublicMeetingApi = async (meetingId: string): Promise<void> => {
  await axiosConfig.delete(`public-meetings/${meetingId}`);
};

// Start public meeting
export const startPublicMeetingApi = async (meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/start`);
  return response.data;
};

// End public meeting
export const endPublicMeetingApi = async (meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/end`);
  return response.data;
};

// Join public meeting
export const joinPublicMeetingApi = async (meetingId: string): Promise<IMeetingParticipant> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/join`);
  return response.data;
};

// Safe join public meeting - returns blocked status instead of throwing error
export const safeJoinPublicMeetingApi = async (meetingId: string): Promise<{
  success: boolean;
  data?: IMeetingParticipant;
  blocked?: boolean;
  message?: string;
}> => {
  try {
    const response = await axiosConfig.post(`public-meetings/${meetingId}/join`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || "";
    
    // Handle 403 blocked status without console error
    if (statusCode === 403 && errorMessage.toLowerCase().includes('blocked')) {
      return {
        success: false,
        blocked: true,
        message: errorMessage || 'You have been blocked from this meeting'
      };
    }
    
    // Re-throw other errors
    throw error;
  }
};

// Leave public meeting
export const leavePublicMeetingApi = async (meetingId: string): Promise<void> => {
  await axiosConfig.post(`public-meetings/${meetingId}/leave`);
};

// Lock public meeting
export const lockPublicMeetingApi = async (meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/lock`);
  return response.data;
};

// Unlock public meeting
export const unlockPublicMeetingApi = async (meetingId: string): Promise<IMeeting> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/unlock`);
  return response.data;
};

// Get participants
export const getMeetingParticipantsApi = async (classroomId: string, meetingId: string): Promise<IMeetingParticipant[]> => {
  const response = await axiosConfig.get(`classrooms/${classroomId}/meetings/${meetingId}/participants`);
  return response.data;
};

export const getPublicMeetingParticipantsApi = async (meetingId: string): Promise<IMeetingParticipant[]> => {
  const response = await axiosConfig.get(`public-meetings/${meetingId}/participants`);
  return response.data;
};

// Get chat messages
export const getMeetingChatApi = async (classroomId: string, meetingId: string, params?: { page?: number; limit?: number }): Promise<{ data: IMeetingChatMessage[]; total: number; page: number; limit: number; totalPages: number }> => {
  const response = await axiosConfig.get(`classrooms/${classroomId}/meetings/${meetingId}/chat`, { params });
  return response.data;
};

export const getPublicMeetingChatApi = async (meetingId: string, params?: { page?: number; limit?: number }): Promise<{ data: IMeetingChatMessage[]; total: number; page: number; limit: number; totalPages: number }> => {
  const response = await axiosConfig.get(`public-meetings/${meetingId}/chat`, { params });
  return response.data;
};

// Kick participant
export const kickParticipantApi = async (classroomId: string, meetingId: string, participantId: string): Promise<{ message: string }> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/participants/${participantId}/kick`);
  return response.data;
};

export const kickPublicMeetingParticipantApi = async (meetingId: string, participantId: string): Promise<{ message: string }> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/participants/${participantId}/kick`);
  return response.data;
};

// Mute participant
export const muteParticipantApi = async (classroomId: string, meetingId: string, participantId: string): Promise<IMeetingParticipant> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/participants/${participantId}/mute`);
  return response.data;
};

export const mutePublicMeetingParticipantApi = async (meetingId: string, participantId: string): Promise<IMeetingParticipant> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/participants/${participantId}/mute`);
  return response.data;
};

// Promote participant
export const promoteParticipantApi = async (classroomId: string, meetingId: string, participantId: string): Promise<IMeetingParticipant> => {
  const response = await axiosConfig.post(`classrooms/${classroomId}/meetings/${meetingId}/participants/${participantId}/promote`);
  return response.data;
};

export const promotePublicMeetingParticipantApi = async (meetingId: string, participantId: string): Promise<IMeetingParticipant> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/participants/${participantId}/promote`);
  return response.data;
};

// Block participant
export const blockPublicMeetingParticipantApi = async (meetingId: string, participantId: string): Promise<{ message: string }> => {
  const response = await axiosConfig.post(`public-meetings/${meetingId}/participants/${participantId}/block`);
  return response.data;
};

// Interfaces for participants and chat
export interface IMeetingChatMessage {
  id: string;
  message: string;
  type: MessageType;
  sender: {
    user_id: string;
    name: string;
    avatar_url?: string;
  } | null;
  metadata?: any;
  created_at: string;
}

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  REACTION = 'reaction',
}

