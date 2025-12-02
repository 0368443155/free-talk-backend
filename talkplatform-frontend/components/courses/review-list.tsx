'use client';

import { Review } from '@/api/courses.rest';
import { ReviewStars } from './review-stars';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { hideReviewApi, showReviewApi } from '@/api/courses.rest';

interface ReviewListProps {
    reviews: Review[];
    loading?: boolean;
    courseId: string;
    isTeacher?: boolean;
    isFreeCourse?: boolean;
    onReviewUpdated?: () => void;
}

export function ReviewList({ 
    reviews, 
    loading, 
    courseId, 
    isTeacher = false, 
    isFreeCourse = false,
    onReviewUpdated 
}: ReviewListProps) {
    const { toast } = useToast();

    const handleToggleVisibility = async (reviewId: string, isHidden: boolean) => {
        try {
            if (isHidden) {
                await hideReviewApi(courseId, reviewId);
                toast({
                    title: "Success",
                    description: "Review hidden successfully",
                });
            } else {
                await showReviewApi(courseId, reviewId);
                toast({
                    title: "Success",
                    description: "Review shown successfully",
                });
            }
            onReviewUpdated?.();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update review visibility",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-6 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                                <div className="h-4 bg-gray-200 rounded w-1/3" />
                                <div className="h-16 bg-gray-200 rounded w-full" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <Card className="p-12 text-center">
                <p className="text-gray-500">No reviews yet. Be the first to review this course!</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <Card key={review.id} className={`p-6 ${review.is_hidden ? 'opacity-60' : ''}`}>
                    <div className="flex gap-4">
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={review.user?.avatar_url} />
                            <AvatarFallback>
                                {review.user?.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900">
                                            {review.user?.username || 'Anonymous'}
                                        </h4>
                                        {review.is_hidden && (
                                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                                Hidden
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <ReviewStars rating={review.rating} size="sm" />
                                        <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(review.created_at), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>
                                </div>
                                {isTeacher && isFreeCourse && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleVisibility(review.id, !review.is_hidden)}
                                        className="ml-2"
                                    >
                                        {review.is_hidden ? (
                                            <>
                                                <Eye className="w-4 h-4 mr-1" />
                                                Show
                                            </>
                                        ) : (
                                            <>
                                                <EyeOff className="w-4 h-4 mr-1" />
                                                Hide
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {review.comment && (
                                <p className={`text-gray-700 text-sm leading-relaxed mt-3 ${review.is_hidden ? 'opacity-50 italic' : ''}`}>
                                    {review.is_hidden ? '(This review has been hidden)' : review.comment}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
