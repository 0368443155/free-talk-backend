export class AffiliateStatsDto {
  total_referrals: number;
  total_earnings: number;
  this_month_earnings: number;
  recent_referrals: {
    id: string;
    name: string;
    avatar: string;
    joined_at: Date;
  }[];
  referral_code: string; // Changed from referral_link to referral_code
}

export class ReferralDto {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  joined_at: Date;
  total_spent: number;
  is_active: boolean;
}

export class EarningsHistoryDto {
  date: string;
  earnings: number;
  referrals_count: number;
  transactions: {
    id: string;
    amount: number;
    description: string;
    created_at: Date;
  }[];
}

export class ValidateAffiliateCodeDto {
  valid: boolean;
  referrer?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  message?: string;
}

