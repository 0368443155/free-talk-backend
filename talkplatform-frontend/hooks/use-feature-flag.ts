import { useState, useEffect } from 'react';
import { checkFeatureFlag } from '@/api/feature-flags.rest';
import { useUser } from '@/store/user-store';

/**
 * Hook to check if a feature flag is enabled
 * Supports rollout percentage for gradual rollout
 */
export function useFeatureFlag(flagName: string): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userInfo } = useUser();

  useEffect(() => {
    let mounted = true;

    const checkFlag = async () => {
      setIsLoading(true);
      try {
        const enabled = await checkFeatureFlag(flagName, userInfo?.id);
        if (mounted) {
          setIsEnabled(enabled);
        }
      } catch (error) {
        console.error(`Error checking feature flag ${flagName}:`, error);
        if (mounted) {
          setIsEnabled(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkFlag();

    // Re-check every 5 minutes (in case flag changes)
    const interval = setInterval(checkFlag, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [flagName, userInfo?.id]);

  return isEnabled;
}

