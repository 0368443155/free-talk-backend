import axiosConfig from './axiosConfig';
import axios from 'axios';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export interface IUserInfo {
  user_id: string;
  id: string;
  email: string;
  username: string;
  name: string;
  avatar_url?: string;
  avartar_url?: string; // Backend typo compatibility
  role: UserRole;
  credit_balance: number;
  affiliate_code?: string;
  refferrer_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ILoginResponse {
  accessToken: string;
  user: IUserInfo;
}

export interface IRegisterData {
  email: string;
  username: string;
  password: string;
  referralCode?: string;
}

export interface ILoginData {
  email: string;
  password: string;
}

// Get user info (client-side)
export const getUserInfoApi = async (): Promise<IUserInfo> => {
  const response = await axiosConfig.get('/auth/me');
  return response.data;
};

// Get user info (server-side with token)
export const getUserInfoApiSsr = async (token: string): Promise<{ data: IUserInfo }> => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return { data: response.data };
};

// Register
export const registerApi = async (data: IRegisterData): Promise<ILoginResponse> => {
  const response = await axiosConfig.post('/auth/register', data);
  return response.data;
};

// Login
export const loginApi = async (data: ILoginData): Promise<ILoginResponse> => {
  const response = await axiosConfig.post('/auth/login', data);
  return response.data;
};

// Logout
export const logoutApi = async (): Promise<void> => {
  await axiosConfig.post('/auth/logout');
};

// Update user profile
export const updateUserProfileApi = async (data: Partial<IUserInfo>): Promise<IUserInfo> => {
  const response = await axiosConfig.patch('/users/profile', data);
  return response.data;
};

// Get user by ID
export const getUserByIdApi = async (userId: string): Promise<IUserInfo> => {
  const response = await axiosConfig.get(`/users/${userId}`);
  return response.data;
};

