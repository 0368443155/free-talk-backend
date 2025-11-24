import axiosConfig from './axiosConfig';

export interface WalletBalance {
  balance: number;
  account_id: string;
}

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

export interface WalletHistory {
  entries: LedgerEntry[];
  total: number;
  limit: number;
  offset: number;
}

export const getWalletBalanceApi = async (): Promise<WalletBalance> => {
  const res = await axiosConfig.get('/wallet/balance');
  return res.data;
};

export const getWalletHistoryApi = async (limit: number = 50, offset: number = 0): Promise<WalletHistory> => {
  const res = await axiosConfig.get('/wallet/history', { params: { limit, offset } });
  return res.data;
};

