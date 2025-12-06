import axiosConfig from './axiosConfig';

export interface AffiliateStats {
  total_referrals: number;
  total_earnings: number;
  this_month_earnings: number;
  recent_referrals: {
    id: string;
    name: string;
    avatar: string;
    joined_at: string;
  }[];
  referral_code: string; // Changed from referral_link to referral_code
}

export interface Referral {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  joined_at: string;
  total_spent: number;
  is_active: boolean;
}

export interface ReferralsResponse {
  referrals: Referral[];
  total: number;
}

export interface EarningsHistoryItem {
  date: string;
  earnings: number;
  referrals_count: number;
  transactions: {
    id: string;
    amount: number;
    description: string;
    created_at: string;
  }[];
}

export interface ValidateAffiliateCodeResponse {
  valid: boolean;
  referrer?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  message?: string;
}

/**
 * Get affiliate dashboard statistics
 */
export const getAffiliateDashboardApi = async (): Promise<AffiliateStats> => {
  const response = await axiosConfig.get('/affiliate/dashboard');
  return response.data;
};

/**
 * Get list of referrals with pagination
 */
export const getReferralsApi = async (
  page: number = 1,
  limit: number = 20,
): Promise<ReferralsResponse> => {
  const response = await axiosConfig.get('/affiliate/referrals', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get earnings history
 */
export const getEarningsHistoryApi = async (
  period: 'week' | 'month' | 'year' = 'month',
): Promise<EarningsHistoryItem[]> => {
  const response = await axiosConfig.get('/affiliate/earnings-history', {
    params: { period },
  });
  return response.data;
};

/**
 * Validate affiliate code
 */
export const validateAffiliateCodeApi = async (
  code: string,
): Promise<ValidateAffiliateCodeResponse> => {
  const response = await axiosConfig.get(`/affiliate/validate/${code}`);
  return response.data;
};

/**
 * Validate referral code (public endpoint - for registration)
 */
export const validateReferralCodeApi = async (code: string): Promise<{
  valid: boolean;
  message?: string;
  referrer_name?: string;
}> => {
  const response = await axiosConfig.get(`/affiliate/validate-code/${code}`, {
    headers: {
      // No auth token needed for public endpoint
    }
  });
  return response.data;
};

