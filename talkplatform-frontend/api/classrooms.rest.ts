import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

export interface IClassroom {
  id: string;
  name: string;
  description?: string;
  teacher: {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
    role: string;
  };
  is_active: boolean;
  cover_image?: string;
  settings?: any;
  members?: IClassroomMember[];
  created_at: string;
  updated_at: string;
}

export interface IClassroomMember {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
  role: 'student' | 'assistant';
  joined_at: string;
}

export interface IClassroomMeeting {
  id: string;
  title: string;
  description?: string;
  classroom: {
    id: string;
    name: string;
  };
  host: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  is_private: boolean;
  is_locked: boolean;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  max_participants: number;
  current_participants: number;
  total_participants: number;
  participants?: any[];
  settings?: any;
  created_at: string;
}

export interface ICreateClassroom {
  name: string;
  description?: string;
  cover_image?: string;
}

export interface ICreateClassroomMeeting {
  title: string;
  description?: string;
  scheduled_at?: string;
  max_participants?: number;
  is_private?: boolean;
}

export interface IClassroomListResponse {
  data: IClassroom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IClassroomMeetingListResponse {
  data: IClassroomMeeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== API FUNCTIONS ====================

export const getClassroomsApi = async (
  page: number = 1,
  limit: number = 10
): Promise<IClassroomListResponse> => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get(`${API_URL}/classrooms`, {
    params: { page, limit },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getClassroomApi = async (id: string): Promise<IClassroom> => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get(`${API_URL}/classrooms/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createClassroomApi = async (
  data: ICreateClassroom
): Promise<IClassroom> => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.post(`${API_URL}/classrooms`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getClassroomMeetingsApi = async (
  classroomId: string,
  page: number = 1,
  limit: number = 10
): Promise<IClassroomMeetingListResponse> => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get(`${API_URL}/classrooms/${classroomId}/meetings`, {
    params: { page, limit },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getClassroomMeetingApi = async (
  classroomId: string,
  meetingId: string
): Promise<IClassroomMeeting> => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get(
    `${API_URL}/classrooms/${classroomId}/meetings/${meetingId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const createClassroomMeetingApi = async (
  classroomId: string,
  data: ICreateClassroomMeeting
): Promise<IClassroomMeeting> => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.post(
    `${API_URL}/classrooms/${classroomId}/meetings`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};
