"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
    Clock,
    Users,
    BookOpen,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Edit,
    PlayCircle,
    Globe,
    Award,
    FileText,
    Share2,
    MoreVertical
} from 'lucide-react';
import { getCourseByIdApi, Course } from '@/api/courses.rest';
import { enrollInCourseApi, purchaseSessionApi, checkSessionAccessApi, getMyEnrollmentsApi } from '@/api/enrollments.rest';
import { useUser } from '@/store/user-store';
import { LessonCard } from '@/components/courses/lesson-card';
import { PaymentConfirmationModal } from '@/components/courses/payment-confirmation-modal';
import { StarRating } from '@/components/ui/star-rating';
import { Separator } from '@/components/ui/separator';
import { ReviewStats } from '@/components/courses/review-stats';
import { ReviewList } from '@/components/courses/review-list';
import { ReviewForm } from '@/components/courses/review-form';
import {
    getCourseReviewsApi,
    getReviewStatsApi,
    getMyReviewApi,
    createReviewApi,
    deleteReviewApi,
    Review,
    ReviewStats as ReviewStatsType,
} from '@/api/courses.rest';

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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentType, setPaymentType] = useState<'course' | 'session' | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [hasPurchased, setHasPurchased] = useState(false); // Either enrolled or purchased session
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null);
    const [myReview, setMyReview] = useState<Review | null>(null);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);

    const loadCourse = async () => {
        try {
            setLoading(true);
            const data = await getCourseByIdApi(courseId);
            setCourse(data);

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

    const checkEnrollment = async () => {
        if (!user?.id) {
            setIsEnrolled(false);
            setHasPurchased(false);
            return;
        }

        try {
            const enrollments = await getMyEnrollmentsApi();
            const enrollment = enrollments.find(
                (e) => e.course_id === courseId && e.status === 'active' && e.enrollment_type === 'full_course'
            );
            setIsEnrolled(!!enrollment);

            // Also check if user has purchased any session
            if (!enrollment) {
                try {
                    const { getMySessionPurchasesApi } = await import('@/api/enrollments.rest');
                    const purchases = await getMySessionPurchasesApi();
                    const hasSessionPurchase = purchases.some(
                        (p) => p.course_id === courseId && p.status === 'active'
                    );
                    setHasPurchased(hasSessionPurchase);
                } catch {
                    setHasPurchased(false);
                }
            } else {
                setHasPurchased(true);
            }
        } catch (error) {
            console.error('Failed to check enrollment:', error);
            setIsEnrolled(false);
            setHasPurchased(false);
        }
    };

    const loadReviews = async () => {
        try {
            setLoadingReviews(true);
            const [reviewsData, statsData, myReviewData] = await Promise.all([
                getCourseReviewsApi(courseId),
                getReviewStatsApi(courseId),
                user?.id ? getMyReviewApi(courseId).catch(() => null) : Promise.resolve(null),
            ]);
            setReviews(reviewsData);
            setReviewStats(statsData);
            setMyReview(myReviewData);
        } catch (error: any) {
            console.error('Failed to load reviews:', error);
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleSubmitReview = async (rating: number, comment: string) => {
        try {
            await createReviewApi(courseId, { rating, comment });
            await loadReviews();
            setShowReviewForm(false);
            toast({
                title: "Success",
                description: "Your review has been submitted!",
            });
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to submit review');
        }
    };

    const handleDeleteReview = async () => {
        try {
            await deleteReviewApi(courseId);
            await loadReviews();
            toast({
                title: "Success",
                description: "Your review has been deleted",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to delete review",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        loadCourse();
        checkEnrollment();
        loadReviews();
    }, [courseId, user?.id]);

    const handleBuyFullCourse = () => {
        if (!course?.price_full_course) return;
        setPaymentType('course');
        setPaymentAmount(course.price_full_course);
        setShowPaymentModal(true);
    };

    const handleBuySession = (sessionId: string) => {
        if (!course?.price_per_session) return;
        setPaymentType('session');
        setPaymentAmount(course.price_per_session);
        setPaymentSessionId(sessionId);
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        try {
            setPurchasing(true);

            if (paymentType === 'course') {
                await enrollInCourseApi(courseId, { enrollment_type: 'full_course' });
                toast({
                    title: "Success!",
                    description: "You have successfully enrolled in this course",
                });
            } else if (paymentType === 'session' && paymentSessionId) {
                setPurchasingSession(paymentSessionId);
                await purchaseSessionApi(paymentSessionId);
                toast({
                    title: "Success!",
                    description: "Session purchased successfully",
                });
            }

            setShowPaymentModal(false);
            setPaymentType(null);
            setPaymentAmount(0);
            setPaymentSessionId(null);

            await checkEnrollment();
            await loadCourse();
        } catch (error: any) {
            toast({
                title: "Purchase Failed",
                description: error.response?.data?.message || "Failed to complete purchase",
                variant: "destructive",
            });
        } finally {
            setPurchasing(false);
            setPurchasingSession(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
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

    const isTeacherOrAdmin = user?.id === course.teacher_id || user?.role === 'admin';
    const rating = course?.average_rating || 0;
    const reviewCount = course?.total_reviews || 0;

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section (Dark) */}
            <div className="bg-slate-900 text-white py-8 md:py-12 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row gap-8">
                    {/* Left Content */}
                    <div className="md:w-2/3 space-y-4">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm text-slate-300 mb-4">
                            <span className="cursor-pointer hover:text-white" onClick={() => router.push('/courses')}>Courses</span>
                            <span>/</span>
                            <span className="cursor-pointer hover:text-white">{course.category || 'General'}</span>
                            <span>/</span>
                            <span className="truncate max-w-[200px]">{course.title}</span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                            {course.title}
                        </h1>
                        <p className="text-lg text-slate-200 line-clamp-2">
                            {course.description}
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-amber-400">{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
                                <StarRating rating={rating} size={14} />
                                <span className="text-slate-300 underline">({reviewCount} ratings)</span>
                            </div>
                            <div className="text-slate-300">
                                {course.current_students.toLocaleString()} students
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-300">
                            <div className="flex items-center gap-1">
                                <span className="text-slate-400">Created by</span>
                                <span className="text-white underline cursor-pointer hover:text-blue-400">
                                    {course.teacher?.username}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Last updated {new Date(course.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Globe className="w-4 h-4" />
                                <span>{course.language || 'English'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Placeholder for Mobile (Desktop Sidebar is separate) */}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 relative">

                {/* Left Column (Content) */}
                <div className="md:w-2/3 space-y-8">

                    {/* What you'll learn */}
                    <div className="border border-gray-200 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold mb-4">What you'll learn</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex gap-2 items-start">
                                    <CheckCircle className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-gray-700">Master the core concepts of this subject through practical examples</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Course Content */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Course Content</h2>
                        <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                            <span>{course.total_sessions} sections</span> • <span>{course.duration_hours}h total length</span>
                        </div>

                        <div className="border rounded-md divide-y">
                            {course.sessions?.map((session) => (
                                <div key={session.id} className="bg-white">
                                    <div className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <PlayCircle className="w-5 h-5 text-gray-500" />
                                            <span className="font-medium text-gray-900">{session.title}</span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {session.lessons?.length || 0} lectures
                                        </div>
                                    </div>
                                    {/* Expanded Content (Simplified for now) */}
                                    <div className="p-4 space-y-3">
                                        {session.lessons?.map(lesson => (
                                            <div key={lesson.id} className="flex justify-between items-center text-sm pl-8">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-gray-400" />
                                                    <span className="text-blue-600 hover:underline cursor-pointer">
                                                        {lesson.title}
                                                    </span>
                                                </div>
                                                <span className="text-gray-500">{lesson.duration_minutes}m</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Requirements */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Requirements</h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-700">
                            <li>No prior knowledge required</li>
                            <li>A computer with internet access</li>
                            <li>Willingness to learn</li>
                        </ul>
                    </div>

                    {/* Description */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Description</h2>
                        <div className="prose max-w-none text-gray-700">
                            <p>{course.description}</p>
                        </div>
                    </div>

                    {/* Instructor */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Instructor</h2>
                        {course.teacher && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-blue-600 underline cursor-pointer">
                                        {course.teacher.username}
                                    </h3>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                        {/* Avatar */}
                                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                                            {course.teacher.username.substring(0, 2).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Award className="w-4 h-4" />
                                            <span>Top Rated Instructor</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            <span>{course.current_students} Students</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PlayCircle className="w-4 h-4" />
                                            <span>10 Courses</span>
                                        </div>
                                        <p className="mt-2 text-gray-700">
                                            Experienced instructor with a passion for teaching.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Student Reviews */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Student Reviews</h2>

                        {/* Review Stats */}
                        {reviewStats && <ReviewStats stats={reviewStats} />}

                        {/* Write Review Button/Form */}
                        {hasPurchased && (
                            <div className="mt-6">
                                {!showReviewForm && !myReview && (
                                    <Button onClick={() => setShowReviewForm(true)}>
                                        Write a Review
                                    </Button>
                                )}

                                {!showReviewForm && myReview && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600">You have already reviewed this course.</p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowReviewForm(true)}
                                            >
                                                Edit Review
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDeleteReview}
                                            >
                                                Delete Review
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {showReviewForm && (
                                    <ReviewForm
                                        courseId={courseId}
                                        existingReview={myReview || undefined}
                                        onSubmit={handleSubmitReview}
                                        onCancel={() => setShowReviewForm(false)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Reviews List */}
                        <div className="mt-8">
                            <h3 className="text-xl font-semibold mb-4">
                                All Reviews ({reviewStats?.total || 0})
                            </h3>
                            <ReviewList 
                                reviews={reviews} 
                                loading={loadingReviews}
                                courseId={courseId}
                                isTeacher={user?.id === course?.teacher_id}
                                isFreeCourse={!course?.price_full_course && !course?.price_per_session}
                                onReviewUpdated={loadReviews}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar (Sticky) */}
                <div className="md:w-1/3 relative">
                    <div className="sticky top-4 space-y-4">
                        <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-gray-200">
                            {/* Preview Image/Video */}
                            <div className="aspect-video bg-gray-900 relative group cursor-pointer">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <PlayCircle className="w-8 h-8 text-black ml-1" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 text-center text-white font-bold">
                                    Preview this course
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-gray-900">
                                        ${course.price_full_course || 0}
                                    </span>
                                    {(course.price_full_course || 0) > 0 && (
                                        <span className="text-lg text-gray-500 line-through">
                                            ${((course.price_full_course || 0) * 1.2).toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                {!isEnrolled ? (
                                    <div className="space-y-3">
                                        <Button
                                            className="w-full h-12 text-lg font-bold bg-purple-600 hover:bg-purple-700"
                                            onClick={handleBuyFullCourse}
                                            disabled={purchasing}
                                        >
                                            {purchasing ? <Loader2 className="animate-spin" /> : 'Buy Now'}
                                        </Button>
                                        <Button variant="outline" className="w-full h-12 font-bold border-black text-black hover:bg-gray-50">
                                            Add to Cart
                                        </Button>
                                        <p className="text-xs text-center text-gray-500">
                                            30-Day Money-Back Guarantee
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-green-100 text-green-800 p-3 rounded-md text-center font-bold">
                                            You are enrolled!
                                        </div>
                                        <Button className="w-full h-12 text-lg font-bold" onClick={() => router.push(`/courses/${courseId}/learn`)}>
                                            Go to Course
                                        </Button>
                                    </div>
                                )}

                                <div className="space-y-2 pt-4">
                                    <h4 className="font-bold text-sm">This course includes:</h4>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-center gap-2">
                                            <PlayCircle className="w-4 h-4" />
                                            <span>{course.duration_hours} hours on-demand video</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            <span>{course.total_sessions} articles</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            <span>Full lifetime access</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Award className="w-4 h-4" />
                                            <span>Certificate of completion</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex justify-between pt-4 border-t text-sm font-bold underline cursor-pointer">
                                    <span>Share</span>
                                    <span>Gift this course</span>
                                    <span>Apply Coupon</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <PaymentConfirmationModal
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
                onConfirm={handleConfirmPayment}
                title={paymentType === 'course' ? 'Confirm Course Enrollment' : 'Confirm Session Purchase'}
                description={
                    paymentType === 'course'
                        ? `Are you sure you want to enroll in "${course?.title}"? This will grant you access to all sessions in this course.`
                        : `Are you sure you want to purchase this session?`
                }
                amount={paymentAmount}
                currentBalance={user?.credit_balance || 0}
                isProcessing={purchasing}
            />
        </div>
    );
}
