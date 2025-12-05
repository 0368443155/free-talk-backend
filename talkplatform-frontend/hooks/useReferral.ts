'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const COOKIE_NAME = 'referral_code';
const COOKIE_DURATION = 30; // 30 days

/**
 * Hook to track referral code from URL query parameter
 * Saves to localStorage and cookie for persistence
 */
export function useReferral() {
    const searchParams = useSearchParams();
    const [referralCode, setReferralCode] = useState<string | null>(null);

    useEffect(() => {
        // Check URL query parameter first
        const refCode = searchParams.get('ref');
        
        if (refCode) {
            // Save to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(COOKIE_NAME, refCode);
                
                // Save to Cookie (for server-side access if needed)
                const d = new Date();
                d.setTime(d.getTime() + (COOKIE_DURATION * 24 * 60 * 60 * 1000));
                document.cookie = `${COOKIE_NAME}=${refCode};expires=${d.toUTCString()};path=/`;
                
                setReferralCode(refCode);
            }
        } else {
            // If no query param, check localStorage
            if (typeof window !== 'undefined') {
                const storedCode = localStorage.getItem(COOKIE_NAME);
                if (storedCode) {
                    setReferralCode(storedCode);
                }
            }
        }
    }, [searchParams]);
    
    /**
     * Get referral code from storage
     */
    const getReferralCode = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(COOKIE_NAME);
    };

    /**
     * Clear referral code
     */
    const clearReferralCode = (): void => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(COOKIE_NAME);
        document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        setReferralCode(null);
    };

    return { 
        referralCode, 
        getReferralCode, 
        clearReferralCode 
    };
}

