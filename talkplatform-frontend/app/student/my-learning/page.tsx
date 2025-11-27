"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
    BookOpen,
    Calendar,
    DollarSign,
    Loader2,
    ArrowRight,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    GraduationCap,
} from 'lucide-react';
import { getMyEnrollmentsApi, getMySessionPurchasesApi, cancelEnrollmentApi, cancelSessionPurchaseApi, CourseEnrollment, SessionPurchase } from '@/api/enrollments.rest';
import { useUser } from '@/store/user-store';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

export default function MyLearningPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { userInfo } = useUser();
    const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
    const [sessionPurchases, setSessionPurchases] = useState<SessionPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [cancelDialog, setCancelDialog] = useState<{ type: 'enrollment' | 'purchase'; id: string; title: string } | null>(null);

    useEffect(() => {
        if (userInfo) {
            loadData();
        }
    }, [userInfo]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [enrollmentsData, purchasesData] = await Promise.all([
                getMyEnrollmentsApi(),
                getMySessionPurchasesApi(),
            ]);
            setEnrollments(enrollmentsData);
            setSessionPurchases(purchasesData);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to load your learning data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEnrollment = async () => {
        if (!cancelDialog) return;

        try {
            setCancelling(cancelDialog.id);
            await cancelEnrollmentApi(cancelDialog.id);
            toast({
                title: "Success",
                description: "Enrollment cancelled and refunded",
            });
            setCancelDialog(null);
            await loadData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to cancel enrollment",
                variant: "destructive",
            });
        } finally {
            setCancelling(null);
        }
    };

    const handleCancelPurchase = async () => {
        if (!cancelDialog) return;

        try {
            setCancelling(cancelDialog.id);
            await cancelSessionPurchaseApi(cancelDialog.id);
            toast({
                title: "Success",
                description: "Purchase cancelled and refunded",
            });
            setCancelDialog(null);
            await loadData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to cancel purchase",
                variant: "destructive",
            });
        } finally {
            setCancelling(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Learning</h1>
                    <p className="text-gray-600">Manage your course enrollments and session purchases</p>
                </div>

                <Tabs defaultValue="enrollments" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="enrollments">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Enrollments ({enrollments.length})
                        </TabsTrigger>
                        <TabsTrigger value="purchases">
                            <Calendar className="w-4 h-4 mr-2" />
                            Session Purchases ({sessionPurchases.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="enrollments" className="space-y-4">
                        {enrollments.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No enrollments yet</h3>
                                    <p className="text-gray-600 mb-4">Start learning by enrolling in a course</p>
                                    <Button onClick={() => router.push('/courses')}>
                                        Browse Courses
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {enrollments.map((enrollment) => (
                                    <Card key={enrollment.id}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="text-lg font-semibold">
                                                            {enrollment.course?.title || 'Course'}
                                                        </h3>
                                                        <Badge
                                                            variant={
                                                                enrollment.status === 'active' ? 'default' :
                                                                enrollment.status === 'completed' ? 'secondary' :
                                                                'destructive'
                                                            }
                                                        >
                                                            {enrollment.status}
                                                        </Badge>
                                                        {enrollment.payment_status === 'paid' && (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Paid
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {enrollment.course?.teacher && (
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            Teacher: {enrollment.course.teacher.username}
                                                        </p>
                                                    )}

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                                        <div>
                                                            <p className="text-gray-500">Price Paid</p>
                                                            <p className="font-semibold">${enrollment.total_price_paid}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Progress</p>
                                                            <p className="font-semibold">{enrollment.completion_percentage}%</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Enrolled</p>
                                                            <p className="font-semibold">
                                                                {formatDistanceToNow(new Date(enrollment.enrolled_at), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Sessions</p>
                                                            <p className="font-semibold">{enrollment.course?.total_sessions || 0}</p>
                                                        </div>
                                                    </div>

                                                    {enrollment.status === 'active' && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => router.push(`/courses/${enrollment.course_id}`)}
                                                        >
                                                            Continue Learning
                                                            <ArrowRight className="w-4 h-4 ml-2" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {enrollment.status === 'active' && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setCancelDialog({
                                                            type: 'enrollment',
                                                            id: enrollment.id,
                                                            title: enrollment.course?.title || 'Course'
                                                        })}
                                                        disabled={cancelling === enrollment.id}
                                                    >
                                                        {cancelling === enrollment.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            'Cancel'
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="purchases" className="space-y-4">
                        {sessionPurchases.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No session purchases yet</h3>
                                    <p className="text-gray-600 mb-4">Purchase individual sessions from courses</p>
                                    <Button onClick={() => router.push('/courses')}>
                                        Browse Courses
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {sessionPurchases.map((purchase) => (
                                    <Card key={purchase.id}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="text-lg font-semibold">
                                                            {purchase.session?.title || `Session ${purchase.session?.session_number || ''}`}
                                                        </h3>
                                                        <Badge
                                                            variant={
                                                                purchase.status === 'active' ? 'default' :
                                                                purchase.status === 'attended' ? 'secondary' :
                                                                purchase.status === 'cancelled' ? 'destructive' :
                                                                'outline'
                                                            }
                                                        >
                                                            {purchase.status}
                                                        </Badge>
                                                        {purchase.attended && (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Attended
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {purchase.course && (
                                                        <p className="text-sm text-gray-600 mb-1">
                                                            Course: {purchase.course.title}
                                                        </p>
                                                    )}

                                                    {purchase.session && (
                                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-4 h-4" />
                                                                {new Date(purchase.session.scheduled_date).toLocaleDateString()}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                {purchase.session.start_time} - {purchase.session.end_time}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                                                        <div>
                                                            <p className="text-gray-500">Price Paid</p>
                                                            <p className="font-semibold">${purchase.price_paid}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Purchased</p>
                                                            <p className="font-semibold">
                                                                {formatDistanceToNow(new Date(purchase.purchased_at), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                        {purchase.attended && (
                                                            <div>
                                                                <p className="text-gray-500">Duration</p>
                                                                <p className="font-semibold">{purchase.attendance_duration_minutes} min</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {purchase.status === 'active' && purchase.session && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => router.push(`/courses/${purchase.course_id}`)}
                                                        >
                                                            View Session
                                                            <ArrowRight className="w-4 h-4 ml-2" />
                                                        </Button>
                                                    )}
                                                </div>

                                                {purchase.status === 'active' && !purchase.attended && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setCancelDialog({
                                                            type: 'purchase',
                                                            id: purchase.id,
                                                            title: purchase.session?.title || 'Session'
                                                        })}
                                                        disabled={cancelling === purchase.id}
                                                    >
                                                        {cancelling === purchase.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            'Cancel'
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel {cancelDialog?.type === 'enrollment' ? 'Enrollment' : 'Purchase'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel "{cancelDialog?.title}"? 
                            {cancelDialog?.type === 'enrollment' 
                                ? ' You will receive a full refund to your credit balance.'
                                : ' You will receive a refund to your credit balance if the session has not started.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep {cancelDialog?.type === 'enrollment' ? 'Enrollment' : 'Purchase'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={cancelDialog?.type === 'enrollment' ? handleCancelEnrollment : handleCancelPurchase}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Cancel {cancelDialog?.type === 'enrollment' ? 'Enrollment' : 'Purchase'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
