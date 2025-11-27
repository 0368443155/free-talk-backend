"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
    Calendar,
    Clock,
    DollarSign,
    Users,
    BookOpen,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowLeft,
    Video,
    Award,
} from 'lucide-react';
import { getCourseByIdApi, Course } from '@/api/courses.rest';
import { enrollInCourseApi, purchaseSessionApi, checkSessionAccessApi } from '@/api/enrollments.rest';
import { useUser } from '@/store/user-store';
import { Edit } from 'lucide-react';
import { CreditBalance } from '@/components/courses/credit-balance';
import { LessonCard } from '@/components/courses/lesson-card';

export default function CourseDetailPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;
    const { toast } = useToast();
    const { userInfo: user } = useUser();

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [purchasingSession, setPurchasingSession] = useState<string | null>(null);
    const [sessionAccess, setSessionAccess] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const loadCourse = async () => {
        try {
            setLoading(true);
            const data = await getCourseByIdApi(courseId);
            setCourse(data);

            // Check access for each session
            if (data.sessions) {
                const accessChecks = await Promise.all(
                    data.sessions.map(async (session) => {
                        try {
                            const { hasAccess } = await checkSessionAccessApi(session.id);
                            return { sessionId: session.id, hasAccess };
                        } catch {
                            return { sessionId: session.id, hasAccess: false };
                        }
                    })
                );

                const accessMap: Record<string, boolean> = {};
                accessChecks.forEach(({ sessionId, hasAccess }) => {
                    accessMap[sessionId] = hasAccess;
                });
                setSessionAccess(accessMap);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to load course",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBuyFullCourse = async () => {
        try {
            setPurchasing(true);
            await enrollInCourseApi(courseId, { enrollment_type: 'full_course' });

            toast({
                title: "Success!",
                description: "You have successfully enrolled in this course",
            });

            // Reload course to update access
            await loadCourse();
        } catch (error: any) {
            toast({
                title: "Purchase Failed",
                description: error.response?.data?.message || "Failed to enroll in course",
                variant: "destructive",
            });
        } finally {
            setPurchasing(false);
        }
    };

    const handleBuySession = async (sessionId: string) => {
        try {
            setPurchasingSession(sessionId);
            await purchaseSessionApi(sessionId);

            toast({
                title: "Success!",
                description: "Session purchased successfully",
            });

            // Reload course to update access
            await loadCourse();
        } catch (error: any) {
            toast({
                title: "Purchase Failed",
                description: error.response?.data?.message || "Failed to purchase session",
                variant: "destructive",
            });
        } finally {
            setPurchasingSession(null);
        }
    };

    const handleJoinSession = (sessionId: string) => {
        router.push(`/sessions/${sessionId}/join`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h2>
                    <Button onClick={() => router.push('/courses')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Courses
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                                {(user?.id === course.teacher_id || user?.role === 'admin') && (
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push(`/courses/${courseId}/edit`)}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Course
                                    </Button>
                                )}
                            </div>
                            <p className="text-gray-600 mt-2">{course.description}</p>

                            <div className="flex items-center gap-4 mt-4">
                                <Badge variant="secondary">
                                    <BookOpen className="w-3 h-3 mr-1" />
                                    {course.total_sessions} Sessions
                                </Badge>
                                <Badge variant="secondary">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {course.duration_hours} Hours
                                </Badge>
                                <Badge variant="secondary">
                                    <Users className="w-3 h-3 mr-1" />
                                    {course.current_students}/{course.max_students} Students
                                </Badge>
                                {course.language && (
                                    <Badge variant="outline">{course.language}</Badge>
                                )}
                                {course.level && (
                                    <Badge variant="outline">{course.level}</Badge>
                                )}
                            </div>
                        </div>

                        {/* Price Card & Credit Balance */}
                        <div className="w-80 space-y-4">
                            <CreditBalance />
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-2xl">
                                        ${course.price_full_course || 0}
                                    </CardTitle>
                                    <CardDescription>Full Course Price</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleBuyFullCourse}
                                        disabled={purchasing || (user?.credit_balance || 0) < (course.price_full_course || 0)}
                                    >
                                        {purchasing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <DollarSign className="w-4 h-4 mr-2" />
                                                Buy Full Course
                                            </>
                                        )}
                                    </Button>

                                    {(user?.credit_balance || 0) < (course.price_full_course || 0) && (
                                        <p className="text-xs text-red-600 text-center">
                                            Insufficient credits. Add more credits to purchase.
                                        </p>
                                    )}

                                    {course.price_per_session && (
                                        <div className="text-center text-sm text-gray-600">
                                            or ${course.price_per_session} per session
                                        </div>
                                    )}

                                    <div className="pt-4 border-t space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span>Access to all {course.total_sessions} sessions</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span>Lifetime access</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span>Certificate of completion</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Tabs defaultValue="sessions" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="sessions">Sessions</TabsTrigger>
                        <TabsTrigger value="about">About</TabsTrigger>
                        <TabsTrigger value="teacher">Teacher</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sessions" className="space-y-4">
                        <h2 className="text-2xl font-bold">Course Sessions</h2>

                        {course.sessions && course.sessions.length > 0 ? (
                            <div className="space-y-4">
                                {course.sessions.map((session) => {
                                    const hasAccess = sessionAccess[session.id];
                                    const isPurchasing = purchasingSession === session.id;

                                    return (
                                        <Card key={session.id}>
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge>Session {session.session_number}</Badge>
                                                            {hasAccess && (
                                                                <Badge variant="default" className="bg-green-600">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Enrolled
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h3 className="text-lg font-semibold">{session.title}</h3>
                                                        {session.description && (
                                                            <p className="text-gray-600 mt-1">{session.description}</p>
                                                        )}
                                                        {session.lessons && session.lessons.length > 0 && (
                                                            <div className="mt-4 space-y-3">
                                                                <p className="text-sm font-medium text-gray-700">
                                                                    Lessons ({session.lessons.length}):
                                                                </p>
                                                                {session.lessons.map((lesson) => (
                                                                    <LessonCard
                                                                        key={lesson.id}
                                                                        lesson={lesson}
                                                                        courseId={courseId}
                                                                        sessionId={session.id}
                                                                        hasSessionAccess={hasAccess}
                                                                        onAccessChange={loadCourse}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!hasAccess && (
                                                        <div className="ml-4">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => handleBuySession(session.id)}
                                                                disabled={isPurchasing}
                                                            >
                                                                {isPurchasing ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Processing...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <DollarSign className="w-4 h-4 mr-2" />
                                                                        Buy ${course.price_per_session}
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No sessions available yet
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="about">
                        <Card>
                            <CardHeader>
                                <CardTitle>About This Course</CardTitle>
                            </CardHeader>
                            <CardContent className="prose max-w-none">
                                <p>{course.description}</p>

                                <h3>Course Details</h3>
                                <ul>
                                    <li>Duration: {course.duration_hours} hours</li>
                                    <li>Total Sessions: {course.total_sessions}</li>
                                    <li>Language: {course.language || 'Not specified'}</li>
                                    <li>Level: {course.level || 'Not specified'}</li>
                                    <li>Category: {course.category || 'Not specified'}</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="teacher">
                        {course.teacher && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>About the Teacher</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-start gap-4">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-white">
                                                {course.teacher.username.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold">{course.teacher.username}</h3>
                                            <p className="text-gray-600">{course.teacher.email}</p>
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => router.push(`/teachers/${course.teacher_id}`)}
                                            >
                                                View Profile
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
