"use client";
export const dynamic = 'force-dynamic';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/store/user-store";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { userInfo: user } = useUser();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    
    if (!token || !user) {
      // Not authenticated, redirect to login
      router.push('/login');
    } else {
      // Authenticated, redirect to dashboard
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
