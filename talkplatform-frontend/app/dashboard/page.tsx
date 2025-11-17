"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/store/user-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Video, GraduationCap, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import BecomeTeacherButton from "@/components/become-teacher-button";

export default function DashboardPage() {
  const router = useRouter();
  const { userInfo: user } = useUser();

  useEffect(() => {
    // Redirect to login if not authenticated
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
  }, [router]);

  useEffect(() => {
    // Load teacher status if the user is a teacher or has applied
    const loadStatus = async () => {
      if (!user) return;
      if (user.role !== 'teacher') {
        setTeacherStatus('none');
        return;
      }
      try {
        const mod = await import('@/api/teachers.rest');
        const profile = await mod.getMyTeacherProfileApi();
        setTeacherStatus(profile.is_verified ? 'verified' : 'pending');
      } catch (e) {
        setTeacherStatus('pending');
      }
    };
    loadStatus();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const [teacherStatus, setTeacherStatus] = React.useState<'none' | 'pending' | 'verified'>('none');
  const isTeacher = teacherStatus === 'verified' || user.role === 'admin';

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user.username}!</h1>
            <p className="text-muted-foreground">
              {isTeacher ? 'Manage your classrooms and meetings' : 'Join classrooms and meetings'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'student' && teacherStatus === 'none' && (
              <BecomeTeacherButton />
            )}
            {user.role === 'teacher' && teacherStatus === 'pending' && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <Clock className="h-4 w-4" /> Pending verification
              </div>
            )}
            {user.role === 'teacher' && teacherStatus === 'verified' && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <ShieldCheck className="h-4 w-4" /> Verified teacher
              </div>
            )}
            {/* Assuming logout is in header globally; leaving space for alignment */}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{user.role}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.credit_balance || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Classrooms */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/classrooms')}>
          <CardHeader>
            <GraduationCap className="h-12 w-12 text-primary mb-4" />
            <CardTitle>Classrooms</CardTitle>
            <CardDescription>
              {isTeacher
                ? 'Create and manage your classrooms, schedule meetings with students'
                : 'View your classrooms and join scheduled meetings'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="default">
              {isTeacher ? 'Manage Classrooms' : 'View Classrooms'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Public Meetings */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/meetings')}>
          <CardHeader>
            <Video className="h-12 w-12 text-blue-600 mb-4" />
            <CardTitle>Public Meetings</CardTitle>
            <CardDescription>
              Browse and join public meetings, or create your own meeting room for anyone to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Browse Meetings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
       {/* Admin */}
       {user.role === 'admin' && (
         <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin')}>
           <CardHeader>
             <Users className="h-12 w-12 text-purple-600 mb-4" />
             <CardTitle>Admin</CardTitle>
             <CardDescription>
               Manage users, teachers, and platform fees
             </CardDescription>
           </CardHeader>
           <CardContent>
             <Button className="w-full" variant="secondary">
               Open Admin Console
               <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </CardContent>
         </Card>
       )}
      </div>

      {/* Info Cards */}
      {isTeacher && (
        <Card className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Teacher Features</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200">
            <ul className="list-disc list-inside space-y-2">
              <li>Create and manage multiple classrooms</li>
              <li>Schedule meetings for your students</li>
              <li>Full video/audio controls and screen sharing</li>
              <li>Private classroom meetings (only members can join)</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
