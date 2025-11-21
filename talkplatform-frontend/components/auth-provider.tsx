"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/store/user-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initializeAuth, isLoading } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    console.log('🔄 AuthProvider mounted, initializing auth...');
    initializeAuth();
  }, [initializeAuth]);

  // Show loading while initializing
  if (isLoading || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Export as default for compatibility
export default AuthProvider;