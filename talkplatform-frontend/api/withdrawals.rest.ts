import axiosConfig from './axiosConfig';

// ==================== TYPES ====================

export interface Withdrawal {
  id: string;
  teacher_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  bank_account_info: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch?: string;
    swift_code?: string;
  };
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWithdrawalDto {
  amount: number;
  bank_account_info: {
    bank_name: string;
    account_number: string;
    account_name: string;
    branch?: string;
    swift_code?: string;
  };
  notes?: string;
}

// ==================== API FUNCTIONS ====================

/**
 * Request withdrawal
 */
export async function requestWithdrawal(dto: CreateWithdrawalDto): Promise<Withdrawal> {
  const response = await axiosConfig.post<Withdrawal>('/withdrawals/request', dto);
  return response.data;
}

/**
 * Get my withdrawals
 */
export async function getMyWithdrawals(): Promise<Withdrawal[]> {
  const response = await axiosConfig.get<Withdrawal[]>('/withdrawals/me');
  return response.data;
}

/**
 * Get withdrawal by ID
 */
export async function getWithdrawalById(id: string): Promise<Withdrawal> {
  const response = await axiosConfig.get<Withdrawal>(`/withdrawals/${id}`);
  return response.data;
}

// ==================== ADMIN API FUNCTIONS ====================

/**
 * Get all withdrawals (admin only)
 */
export async function getAllWithdrawals(status?: string): Promise<Withdrawal[]> {
  const response = await axiosConfig.get<Withdrawal[]>('/admin/withdrawals', {
    params: status ? { status } : {},
  });
  return response.data;
}

/**
 * Approve withdrawal (admin only)
 */
export async function approveWithdrawal(
  id: string,
  adminNotes?: string
): Promise<Withdrawal> {
  const response = await axiosConfig.post<Withdrawal>(`/admin/withdrawals/${id}/approve`, {
    admin_notes: adminNotes,
  });
  return response.data;
}

/**
 * Complete withdrawal (admin only)
 */
export async function completeWithdrawal(
  id: string,
  adminNotes?: string
): Promise<Withdrawal> {
  const response = await axiosConfig.post<Withdrawal>(`/admin/withdrawals/${id}/complete`, {
    admin_notes: adminNotes,
  });
  return response.data;
}

/**
 * Reject withdrawal (admin only)
 */
export async function rejectWithdrawal(
  id: string,
  adminNotes: string
): Promise<Withdrawal> {
  const response = await axiosConfig.post<Withdrawal>(`/admin/withdrawals/${id}/reject`, {
    admin_notes: adminNotes,
  });
  return response.data;
}

