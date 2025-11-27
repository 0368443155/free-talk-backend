"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/store/user-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Video, GraduationCap, ArrowRight, ShieldCheck, Clock, Sparkles, BookOpen, Wallet, Calendar, ShoppingBag } from "lucide-react";
import BecomeTeacherButton from "@/components/become-teacher-button";
import { GlobalChatPanel } from "@/components/global-chat/global-chat-panel";
import { Phase2Navigation } from "@/components/courses/phase2-navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { userInfo: user } = useUser();
  const [teacherStatus, setTeacherStatus] = React.useState<'none' | 'pending' | 'verified'>('none');

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
        console.log('[Dashboard] Teacher profile loaded:', { is_verified: profile.is_verified });
        // Check is_verified
        const isVerified = profile.is_verified === true;
        setTeacherStatus(isVerified ? 'verified' : 'pending');
      } catch (e) {
        console.error('[Dashboard] Failed to load teacher profile:', e);
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

  const isTeacher = teacherStatus === 'verified' || user.role === 'admin';

  return (
    <div className="container mx-auto p-6 max-w-7xl relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="mb-8 p-6 glass rounded-2xl border border-white/20">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold mb-2 font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Welcome back, {user.username}!
                </h1>
                <p className="text-muted-foreground">
                  {isTeacher ? 'Manage your classrooms and meetings' : 'Join classrooms and meetings'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user.role === 'student' && teacherStatus === 'none' && (
                  <BecomeTeacherButton />
                )}
                {user.role === 'teacher' && teacherStatus === 'pending' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-sm font-medium border border-amber-200/50">
                    <Clock className="h-4 w-4" /> Pending verification
                  </div>
                )}
                {user.role === 'teacher' && teacherStatus === 'verified' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-sm font-medium border border-emerald-200/50">
                    <ShieldCheck className="h-4 w-4" /> Verified teacher
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-card border-white/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Role</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize font-heading">{user.role}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Credits</CardTitle>
                <GraduationCap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-heading">{user.credit_balance || 0}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                <Sparkles className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 font-heading">Active</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Learning - Phase 2 */}
            {!isTeacher && (
              <Card className="glass-card border-white/20 hover:scale-[1.02] transition-transform cursor-pointer group" onClick={() => router.push('/student/my-learning')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="font-heading text-xl">My Learning</CardTitle>
                  <CardDescription>
                    View your enrolled courses, session purchases, and learning progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-0" variant="outline">
                    View My Learning
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Browse Courses - Phase 2 */}
            <Card className="glass-card border-white/20 hover:scale-[1.02] transition-transform cursor-pointer group" onClick={() => router.push('/courses')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="font-heading text-xl">Courses</CardTitle>
                <CardDescription>
                  {isTeacher
                    ? 'Create and manage your courses, enroll students'
                    : 'Browse and enroll in courses, purchase sessions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-0" variant="outline">
                  {isTeacher ? 'My Courses' : 'Browse Courses'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Classrooms */}
            <Card className="glass-card border-white/20 hover:scale-[1.02] transition-transform cursor-pointer group" onClick={() => router.push('/classrooms')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">Classrooms</CardTitle>
                <CardDescription>
                  {isTeacher
                    ? 'Create and manage your classrooms, schedule meetings with students'
                    : 'View your classrooms and join scheduled meetings'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-0" variant="outline">
                  {isTeacher ? 'Manage Classrooms' : 'View Classrooms'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Public Meetings */}
            <Card className="glass-card border-white/20 hover:scale-[1.02] transition-transform cursor-pointer group" onClick={() => router.push('/meetings')}>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Video className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="font-heading text-xl">Public Meetings</CardTitle>
                <CardDescription>
                  Browse and join public meetings, or create your own meeting room for anyone to join
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-secondary/10 text-secondary hover:bg-secondary/20 border-0" variant="outline">
                  Browse Meetings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Add Credits - Phase 2 */}
            {!isTeacher && (
              <Card className="glass-card border-white/20 hover:scale-[1.02] transition-transform cursor-pointer group" onClick={() => router.push('/credits')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                    <Wallet className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="font-heading text-xl">Add Credits</CardTitle>
                  <CardDescription>
                    Purchase credits to enroll in courses and purchase sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold text-green-600">${user?.credit_balance || 0}</p>
                  </div>
                  <Button className="w-full bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0" variant="outline">
                    Add Credits
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Admin */}
            {user.role === 'admin' && (
              <Card className="glass-card border-white/20 hover:scale-[1.02] transition-transform cursor-pointer group md:col-span-2" onClick={() => router.push('/admin')}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="font-heading text-xl">Admin Console</CardTitle>
                  <CardDescription>
                    Manage users, teachers, and platform fees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-0" variant="outline">
                    Open Admin Console
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Phase 2 Quick Navigation */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4 font-heading">Course Management</h2>
            <Phase2Navigation />
          </div>

          {/* Info Cards */}
          {isTeacher && (
            <Card className="mt-6 glass border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/30">
              <CardHeader>
                <CardTitle className="text-blue-700 dark:text-blue-300 font-heading flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Teacher Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800 dark:text-blue-200">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Create and manage multiple classrooms
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Schedule meetings for your students
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Full video/audio controls and screen sharing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Private classroom meetings
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Global Chat Panel - Right Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-8rem)] flex flex-col glass-card border-white/20 overflow-hidden sticky top-24">
            <CardHeader className="pb-3 border-b border-white/10 bg-white/50 backdrop-blur-sm">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Global Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 bg-white/30 backdrop-blur-sm">
              <GlobalChatPanel className="h-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
