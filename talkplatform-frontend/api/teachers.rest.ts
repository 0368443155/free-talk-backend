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

export const getTeacherProfileByIdApi = async (teacherId: string): Promise<TeacherProfileDto & { user: { id: string; username: string; email: string; avatar_url?: string } }> => {
  // Try enhanced endpoint first, fallback to simple endpoint
  try {
    const res = await axiosConfig.get(`/teachers/enhanced/${teacherId}/profile`);
    return res.data;
  } catch (error) {
    // Fallback to simple endpoint if enhanced doesn't exist
    const res = await axiosConfig.get(`/teachers/${teacherId}/profile`);
    return res.data;
  }
};

// ==================== Teacher Verification API ====================

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INFO_NEEDED = 'info_needed',
}

export interface DocumentDto {
  name: string;
  key: string;
  year?: number;
  issuer?: string;
}

export interface ReferenceDto {
  name: string;
  email: string;
  relationship: string;
}

export interface SubmitVerificationDto {
  identity_card_front: string; // Storage key
  identity_card_back: string; // Storage key
  degree_certificates?: DocumentDto[];
  teaching_certificates?: DocumentDto[];
  cv_url?: string;
  years_of_experience?: number;
  previous_platforms?: string[];
  references?: ReferenceDto[];
}

export interface VerificationStatusResponse {
  id: string;
  status: VerificationStatus;
  documents: {
    identity_card_front: string;
    identity_card_back: string;
    degree_certificates?: DocumentDto[];
    teaching_certificates?: DocumentDto[];
    cv_url?: string;
  };
  admin_notes?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export const submitVerificationApi = async (data: SubmitVerificationDto): Promise<VerificationStatusResponse> => {
  const res = await axiosConfig.post('/teachers/verification/submit', data);
  return res.data;
};

export const getVerificationStatusApi = async (): Promise<VerificationStatusResponse> => {
  const res = await axiosConfig.get('/teachers/verification/status');
  return res.data;
};

export const getDocumentUrlApi = async (verificationId: string, documentKey: string): Promise<{ url: string }> => {
  const res = await axiosConfig.get(`/teachers/verification/${verificationId}/document/${documentKey}`);
  return res.data;
};