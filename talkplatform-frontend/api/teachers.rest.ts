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
  languagesTaught?: string[];
  specialties?: string[];
  country?: string;
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

// ==================== Get Teachers List API ====================

export interface GetTeachersQuery {
  page?: number;
  limit?: number;
  search?: string;
  minRating?: number;
  maxRate?: number;
  sortBy?: 'rating' | 'rate' | 'hours' | 'newest';
  sortOrder?: 'asc' | 'desc';
  isVerified?: 'true' | 'false';
}

export interface TeacherListItem {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  headline?: string;
  bio?: string;
  intro_video_url?: string;
  hourly_rate: number;
  average_rating: number;
  total_hours_taught: number;
  is_verified: boolean;
}

export interface GetTeachersResponse {
  data: TeacherListItem[];
  pagination: {
    currentPage: number;
    itemsPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export const getTeachersApi = async (query?: GetTeachersQuery): Promise<GetTeachersResponse> => {
  const params = new URLSearchParams();

  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  if (query?.search) params.append('search', query.search);
  if (query?.minRating) params.append('minRating', query.minRating.toString());
  if (query?.maxRate) params.append('maxRate', query.maxRate.toString());
  if (query?.sortBy) params.append('sortBy', query.sortBy);
  if (query?.sortOrder) params.append('sortOrder', query.sortOrder);
  if (query?.isVerified !== undefined) params.append('isVerified', query.isVerified);

  const queryString = params.toString();
  const res = await axiosConfig.get(`/teachers${queryString ? `?${queryString}` : ''}`);
  return res.data;
};

// Get teacher by ID
export const getTeacherByIdApi = async (teacherId: string): Promise<TeacherListItem> => {
  const res = await axiosConfig.get(`/teachers/${teacherId}`);
  return res.data;
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
  file_url: string;
  year?: number;
  issuer?: string;
}

export interface ReferenceDto {
  name: string;
  email: string;
  relationship: string;
}

export interface SubmitVerificationDto {
  identity_card_front: string; // URL to uploaded image file
  identity_card_back: string; // URL to uploaded image file
  degree_certificates?: Array<{
    name: string;
    file_url: string; // URL to uploaded image file
    year?: number;
  }>;
  teaching_certificates?: Array<{
    name: string;
    issuer?: string;
    file_url: string; // URL to uploaded image file
    year?: number;
  }>;
  cv_url?: string; // URL to uploaded PDF file
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

// Upload file for verification
export const uploadVerificationFileApi = async (
  file: File,
  type: 'identity_front' | 'identity_back' | 'degree' | 'teaching' | 'cv'
): Promise<{ url: string; filePath: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const res = await axiosConfig.post('/teachers/verification/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Upload multiple files for certificates
export const uploadVerificationFilesApi = async (
  files: File[],
  type: 'degree' | 'teaching'
): Promise<Array<{ url: string; filePath: string }>> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('type', type);

  const res = await axiosConfig.post('/teachers/verification/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};