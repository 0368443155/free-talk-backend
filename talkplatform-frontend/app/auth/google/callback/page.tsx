"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/store/user-store';
import { Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUserInfo } = useUser();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (!token || !userParam) {
      console.error('Missing token or user data', { hasToken: !!token, hasUser: !!userParam });
      router.push('/login?error=oauth_callback_failed');
      return;
    }

    try {
      // Decode user data (it might be URL encoded)
      const decodedUserParam = decodeURIComponent(userParam);
      
      // Parse user data
      const user = JSON.parse(decodedUserParam);

      if (!user || !user.id) {
        throw new Error('Invalid user data');
      }

      // Save token to localStorage
      localStorage.setItem('accessToken', token);

      // Update user store
      setUserInfo(user);

      console.log('✅ Google OAuth login successful', { userId: user.id, userName: user.name });

      // Small delay to ensure state is updated
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (error: any) {
      console.error('Error processing Google OAuth callback:', error);
      router.push('/login?error=oauth_callback_failed');
    }
  }, [searchParams, router, setUserInfo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}

