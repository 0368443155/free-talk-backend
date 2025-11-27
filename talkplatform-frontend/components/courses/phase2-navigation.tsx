"use client";

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    GraduationCap,
    Wallet,
    DollarSign,
    Calendar,
    ShoppingBag,
    ArrowRight,
    CreditCard,
} from 'lucide-react';
import { useUser } from '@/store/user-store';

/**
 * Phase 2 Navigation Component
 * Quick access buttons to all Phase 2 features
 */
export function Phase2Navigation() {
    const router = useRouter();
    const { userInfo: user } = useUser();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* My Learning */}
            {!isTeacher && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push('/student/my-learning')}>
                    <CardHeader>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg">My Learning</CardTitle>
                        <CardDescription>
                            View your enrolled courses and session purchases
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full group-hover:bg-blue-50">
                            View My Learning
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Browse Courses */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push('/courses')}>
                <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2 group-hover:bg-purple-500/20 transition-colors">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Browse Courses</CardTitle>
                    <CardDescription>
                        {isTeacher ? 'Manage your courses' : 'Discover and enroll in courses'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full group-hover:bg-purple-50">
                        {isTeacher ? 'My Courses' : 'Browse Courses'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>

            {/* Create Course (Teacher only) */}
            {isTeacher && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push('/courses/create')}>
                    <CardHeader>
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-2 group-hover:bg-green-500/20 transition-colors">
                            <BookOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <CardTitle className="text-lg">Create Course</CardTitle>
                        <CardDescription>
                            Create a new course with sessions and lessons
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full group-hover:bg-green-50">
                            Create Course
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Add Credits (Student only) */}
            {!isTeacher && (
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push('/credits')}>
                    <CardHeader>
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-2 group-hover:bg-green-500/20 transition-colors">
                            <Wallet className="h-5 w-5 text-green-600" />
                        </div>
                        <CardTitle className="text-lg">Add Credits</CardTitle>
                        <CardDescription>
                            Purchase credits to enroll in courses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3">
                            <p className="text-xs text-muted-foreground">Current Balance</p>
                            <p className="text-xl font-bold text-green-600">${user?.credit_balance || 0}</p>
                        </div>
                        <Button variant="outline" className="w-full group-hover:bg-green-50">
                            Add Credits
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Credits & Payments */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push('/credits/balance')}>
                <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2 group-hover:bg-orange-500/20 transition-colors">
                        <CreditCard className="h-5 w-5 text-orange-600" />
                    </div>
                    <CardTitle className="text-lg">Credits & Payments</CardTitle>
                    <CardDescription>
                        Manage your credits and view transaction history
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full group-hover:bg-orange-50">
                        View Balance
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

