import axiosConfig from './axiosConfig';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface IUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface IUserListResponse {
  data: IUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminListUsersApi = async (params: { page?: number; limit?: number; role?: UserRole; search?: string } = {}): Promise<IUserListResponse> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.get(`/admin/users`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminUpdateUserRoleApi = async (id: string, role: UserRole): Promise<IUser> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(
    `/admin/users/${id}/role`,
    { role },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const adminAdjustCreditsApi = async (id: string, payload: { delta?: number; setTo?: number }): Promise<IUser> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(
    `/admin/users/${id}/credits`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const adminVerifyTeacherApi = async (userId: string, is_verified: boolean) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(
    `/admin/teachers/${userId}/verify`,
    { is_verified },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export interface AdminTeacherRow {
  user_id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  headline?: string;
  hourly_rate: number;
  average_rating: number;
  total_hours_taught: number;
  is_verified: boolean;
  created_at: string;
}

export interface AdminTeacherListResponse {
  data: AdminTeacherRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminListTeachersApi = async (params: { page?: number; limit?: number; is_verified?: boolean; search?: string } = {}): Promise<AdminTeacherListResponse> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.get(`/admin/teachers`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export interface PlatformFees {
  platformStudent: { platform: number; teacher: number };
  teacherAffiliateStudent: { platform: number; teacher: number };
}

export const adminGetFeesApi = async (): Promise<PlatformFees> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.get(`/admin/settings/platform-fee`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminSetFeesApi = async (fees: PlatformFees): Promise<PlatformFees> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(`/admin/settings/platform-fee`, fees, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Teacher Verification Types
export type VerificationStatus = 'pending' | 'under_review' | 'info_needed' | 'approved' | 'rejected';

export interface ITeacherVerification {
  id: string;
  user_id: string;
  status: VerificationStatus;
  documents: {
    identity_card_front?: string;
    identity_card_back?: string;
    degree_certificates?: Array<{ name: string; key: string; year: number }>;
    teaching_certificates?: Array<{ name: string; issuer: string; key: string; year: number }>;
    cv_url?: string;
  };
  additional_info: {
    years_of_experience?: number;
    previous_platforms?: string[];
    references?: Array<{ name: string; email: string; relationship: string }>;
  };
  admin_notes?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  verified_at?: string;
  resubmission_count: number;
  last_submitted_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ITeacherVerificationListResponse {
  data: ITeacherVerification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminListTeacherVerificationsApi = async (params: {
  page?: number;
  limit?: number;
  status?: VerificationStatus;
  search?: string;
} = {}): Promise<ITeacherVerificationListResponse> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.get(`/admin/teacher-verifications`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminApproveVerificationApi = async (id: string, notes?: string): Promise<ITeacherVerification> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(
    `/teachers/verification/${id}/approve`,
    {},
    {
      params: notes ? { notes } : {},
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const adminRejectVerificationApi = async (id: string, reason: string): Promise<ITeacherVerification> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(
    `/teachers/verification/${id}/reject`,
    { reason },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const adminRequestInfoApi = async (id: string, notes: string): Promise<ITeacherVerification> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(
    `/teachers/verification/${id}/request-info`,
    { notes },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const adminGetVerificationDocumentUrlApi = async (id: string, documentKey: string): Promise<{ url: string }> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  // Encode documentKey to handle special characters in the path
  const encodedKey = encodeURIComponent(documentKey);
  const response = await axiosConfig.get(`/teachers/verification/${id}/document/${encodedKey}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminGetUserApi = async (id: string): Promise<IUser> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.get(`/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminUpdateUserApi = async (id: string, data: { username?: string; email?: string }): Promise<IUser> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.patch(`/admin/users/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminDeleteUserApi = async (id: string): Promise<{ message: string }> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.delete(`/admin/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const adminCreateUserApi = async (data: { username: string; email: string; password: string; role: UserRole }): Promise<IUser> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const response = await axiosConfig.post(`/admin/users`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};