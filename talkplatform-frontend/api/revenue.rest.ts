import axiosConfig from './axiosConfig';

// ==================== TYPES ====================

export interface RevenueSummary {
  total_earnings: number;
  total_commissions: number;
  net_earnings: number;
  pending_payments: number;
  total_withdrawn: number;
  pending_withdrawals: number;
  available_balance: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  completed_at?: string;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== API FUNCTIONS ====================

/**
 * Get teacher revenue summary
 */
export async function getTeacherRevenueSummary(): Promise<RevenueSummary> {
  const response = await axiosConfig.get<RevenueSummary>('/revenue/teacher/summary');
  return response.data;
}

/**
 * Get teacher transaction history
 */
export async function getTeacherTransactionHistory(
  limit: number = 50,
  offset: number = 0
): Promise<TransactionHistoryResponse> {
  const response = await axiosConfig.get<TransactionHistoryResponse>('/revenue/teacher/transactions', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Get teacher withdrawal history
 */
export async function getTeacherWithdrawalHistory(): Promise<Withdrawal[]> {
  const response = await axiosConfig.get<Withdrawal[]>('/revenue/teacher/withdrawals');
  return response.data;
}

// Import Withdrawal type from withdrawals.rest.ts
import type { Withdrawal } from './withdrawals.rest';
export type { Withdrawal };

