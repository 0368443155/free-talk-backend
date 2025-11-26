"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
    BookOpen,
    Calendar,
    Clock,
    DollarSign,
    Video,
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import {
    getMyEnrollmentsApi,
    getMySessionPurchasesApi,
    cancelEnrollmentApi,
    cancelSessionPurchaseApi,
    CourseEnrollment,
    SessionPurchase,
} from '@/api/enrollments.rest';
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

export default function MyEnrollmentsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
    const [purchases, setPurchases] = useState<SessionPurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [itemToCancel, setItemToCancel] = useState<{
        type: 'enrollment' | 'purchase';
        id: string;
        title: string;
    } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [enrollmentsData, purchasesData] = await Promise.all([
                getMyEnrollmentsApi(),
                getMySessionPurchasesApi(),
            ]);
            setEnrollments(enrollmentsData);
            setPurchases(purchasesData);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load your enrollments",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (type: 'enrollment' | 'purchase', id: string, title: string) => {
        setItemToCancel({ type, id, title });
        setCancelDialogOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!itemToCancel) return;

        try {
            setCancelling(itemToCancel.id);

            if (itemToCancel.type === 'enrollment') {
                await cancelEnrollmentApi(itemToCancel.id);
                toast({
                    title: "Enrollment Cancelled",
                    description: "Your enrollment has been cancelled and refunded",
                });
            } else {
                await cancelSessionPurchaseApi(itemToCancel.id);
                toast({
                    title: "Session Cancelled",
                    description: "Your session purchase has been cancelled and refunded",
                });
            }

            // Reload data
            await loadData();
        } catch (error: any) {
            toast({
                title: "Cancellation Failed",
                description: error.response?.data?.message || "Failed to cancel",
                variant: "destructive",
            });
        } finally {
            setCancelling(null);
            setCancelDialogOpen(false);
            setItemToCancel(null);
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
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">My Learning</h1>
                    <p className="text-gray-600 mt-1">Manage your courses and sessions</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <Tabs defaultValue="enrollments" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="enrollments">
                            My Courses ({enrollments.length})
                        </TabsTrigger>
                        <TabsTrigger value="sessions">
                            My Sessions ({purchases.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Course Enrollments */}
                    <TabsContent value="enrollments" className="space-y-4">
                        {enrollments.length > 0 ? (
                            enrollments.map((enrollment) => (
                                <Card key={enrollment.id}>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge
                                                        variant={
                                                            enrollment.status === 'active'
                                                                ? 'default'
                                                                : enrollment.status === 'completed'
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                        }
                                                    >
                                                        {enrollment.status}
                                                    </Badge>
                                                    {enrollment.payment_status === 'refunded' && (
                                                        <Badge variant="outline">Refunded</Badge>
                                                    )}
                                                </div>

                                                <h3 className="text-xl font-semibold">
                                                    {enrollment.course?.title || 'Course'}
                                                </h3>

                                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        Paid: ${enrollment.total_price_paid}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        {enrollment.completion_percentage}% Complete
                                                    </div>
                                                </div>

                                                {enrollment.refund_amount > 0 && (
                                                    <div className="mt-2 text-sm text-green-600">
                                                        Refunded: ${enrollment.refund_amount}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ml-4 flex gap-2">
                                                {enrollment.status === 'active' && (
                                                    <>
                                                        <Button
                                                            onClick={() => router.push(`/courses/${enrollment.course_id}`)}
                                                        >
                                                            <BookOpen className="w-4 h-4 mr-2" />
                                                            Continue Learning
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleCancelClick(
                                                                    'enrollment',
                                                                    enrollment.id,
                                                                    enrollment.course?.title || 'Course'
                                                                )
                                                            }
                                                            disabled={cancelling === enrollment.id}
                                                        >
                                                            {cancelling === enrollment.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                'Cancel & Refund'
                                                            )}
                                                        </Button>
                                                    </>
                                                )}
                                                {enrollment.status === 'completed' && (
                                                    <Button variant="outline">
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        View Certificate
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No enrollments yet
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Start learning by enrolling in a course
                                    </p>
                                    <Button onClick={() => router.push('/courses')}>
                                        Browse Courses
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Session Purchases */}
                    <TabsContent value="sessions" className="space-y-4">
                        {purchases.length > 0 ? (
                            purchases.map((purchase) => (
                                <Card key={purchase.id}>
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge
                                                        variant={
                                                            purchase.status === 'attended'
                                                                ? 'default'
                                                                : purchase.status === 'active'
                                                                    ? 'secondary'
                                                                    : 'destructive'
                                                        }
                                                    >
                                                        {purchase.status}
                                                    </Badge>
                                                    {purchase.attended && (
                                                        <Badge variant="outline" className="bg-green-50">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Attended
                                                        </Badge>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-semibold">
                                                    {purchase.session?.title || 'Session'}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {purchase.course?.title || 'Course'}
                                                </p>

                                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        ${purchase.price_paid}
                                                    </div>
                                                    {purchase.session && (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-4 h-4" />
                                                                {new Date(purchase.session.scheduled_date).toLocaleDateString()}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                {purchase.session.start_time} - {purchase.session.end_time}
                                                            </div>
                                                        </>
                                                    )}
                                                    {purchase.attended && (
                                                        <div className="flex items-center gap-1">
                                                            <Video className="w-4 h-4" />
                                                            {purchase.attendance_duration_minutes} min attended
                                                        </div>
                                                    )}
                                                </div>

                                                {purchase.refund_amount > 0 && (
                                                    <div className="mt-2 text-sm text-green-600">
                                                        Refunded: ${purchase.refund_amount}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ml-4">
                                                {purchase.status === 'active' && !purchase.attended && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() =>
                                                                router.push(`/sessions/${purchase.session_id}/join`)
                                                            }
                                                        >
                                                            <Video className="w-4 h-4 mr-2" />
                                                            Join Session
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleCancelClick(
                                                                    'purchase',
                                                                    purchase.id,
                                                                    purchase.session?.title || 'Session'
                                                                )
                                                            }
                                                            disabled={cancelling === purchase.id}
                                                        >
                                                            {cancelling === purchase.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                'Cancel & Refund'
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No session purchases yet
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Purchase individual sessions to get started
                                    </p>
                                    <Button onClick={() => router.push('/courses')}>
                                        Browse Courses
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel and Refund?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel "{itemToCancel?.title}"? You will receive a full
                            refund to your account balance.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep It</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmCancel}>
                            Yes, Cancel & Refund
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
