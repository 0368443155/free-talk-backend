import axiosConfig from './axiosConfig';

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  rollout_percentage: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a feature flag is enabled for current user
 */
export async function checkFeatureFlag(flagName: string, userId?: string): Promise<boolean> {
  try {
    const response = await axiosConfig.get<FeatureFlag>(`/admin/feature-flags/${flagName}`);
    const flag = response.data;

    if (!flag.enabled) {
      return false;
    }

    // If 100% rollout, return true
    if (flag.rollout_percentage >= 100) {
      return true;
    }

    // If userId provided, check user-specific rollout
    if (userId) {
      // Use consistent hashing to determine if user is in rollout
      const hash = hashUserId(userId);
      const userPercentage = hash % 100;
      return userPercentage < flag.rollout_percentage;
    }

    // If no userId, check global rollout percentage
    // For client-side, we can't determine exact user percentage without userId
    // So we return based on enabled status only
    return flag.enabled;
  } catch (error: any) {
    console.warn(`Feature flag ${flagName} not found or error:`, error.message);
    return false; // Default to false if flag doesn't exist
  }
}

/**
 * Get all feature flags (admin only)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await axiosConfig.get<FeatureFlag[]>('/admin/feature-flags');
  return response.data;
}

/**
 * Hash user ID for consistent rollout
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

