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
