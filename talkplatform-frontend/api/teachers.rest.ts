import axiosConfig from './axiosConfig';

export interface BecomeTeacherResponse {
  user: {
    id: string;
    role: 'teacher' | 'student' | 'admin';
  };
  profile: {
    user_id: string;
    is_verified: boolean;
  };
}

export const becomeTeacherApi = async (): Promise<BecomeTeacherResponse> => {
  const res = await axiosConfig.post('/teachers/me/become-teacher');
  return res.data;
};

export interface UpdateTeacherProfilePayload {
  headline?: string;
  bio?: string;
  introVideoUrl?: string;
  hourlyRate?: number;
}

export const updateMyTeacherProfileApi = async (payload: UpdateTeacherProfilePayload) => {
  const res = await axiosConfig.patch('/teachers/me/profile', payload);
  return res.data as any;
};

export interface TeacherProfileDto {
  user_id: string;
  headline?: string | null;
  bio?: string | null;
  intro_video_url?: string | null;
  hourly_rate: number;
  average_rating: number;
  total_hours_taught: number;
  is_verified: boolean;
}

export const getMyTeacherProfileApi = async (): Promise<TeacherProfileDto> => {
  const res = await axiosConfig.get('/teachers/me/profile');
  return res.data;
};
