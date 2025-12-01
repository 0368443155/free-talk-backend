'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStarsProps {
    rating: number;
    maxRating?: number;
    size?: 'sm' | 'md' | 'lg';
    showNumber?: boolean;
    interactive?: boolean;
    onRatingChange?: (rating: number) => void;
}

export function ReviewStars({
    rating,
    maxRating = 5,
    size = 'md',
    showNumber = false,
    interactive = false,
    onRatingChange,
}: ReviewStarsProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const handleClick = (value: number) => {
        if (interactive && onRatingChange) {
            onRatingChange(value);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }).map((_, index) => {
                const starValue = index + 1;
                const isFilled = starValue <= Math.round(rating);
                const isPartial = starValue > rating && starValue - 1 < rating;

                return (
                    <button
                        key={index}
                        type="button"
                        disabled={!interactive}
                        onClick={() => handleClick(starValue)}
                        className={cn(
                            'relative',
                            interactive && 'cursor-pointer hover:scale-110 transition-transform'
                        )}
                    >
                        <Star
                            className={cn(
                                sizeClasses[size],
                                isFilled
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-200 text-gray-300'
                            )}
                        />
                        {isPartial && (
                            <div
                                className="absolute inset-0 overflow-hidden"
                                style={{ width: `${(rating % 1) * 100}%` }}
                            >
                                <Star
                                    className={cn(
                                        sizeClasses[size],
                                        'fill-yellow-400 text-yellow-400'
                                    )}
                                />
                            </div>
                        )}
                    </button>
                );
            })}
            {showNumber && (
                <span className="ml-1 text-sm font-medium text-gray-700">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
}
