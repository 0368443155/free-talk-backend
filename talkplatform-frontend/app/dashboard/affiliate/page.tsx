'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AffiliateDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to teacher affiliate page
    router.replace('/teacher/affiliate');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to affiliate dashboard...</p>
      </div>
    </div>
  );
}
