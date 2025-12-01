import { Star, StarHalf } from "lucide-react";

interface StarRatingProps {
    rating: number;
    showCount?: boolean;
    count?: number;
    size?: number;
    className?: string;
}

export function StarRating({ rating, showCount = false, count, size = 16, className = "" }: StarRatingProps) {
    // Safety check: ensure rating is a valid number
    const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;

    const fullStars = Math.floor(safeRating);
    const hasHalfStar = safeRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <span className="font-bold text-amber-600 mr-1">{safeRating.toFixed(1)}</span>
            <div className="flex">
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={`full-${i}`} className="fill-amber-500 text-amber-500" size={size} />
                ))}
                {hasHalfStar && <StarHalf className="fill-amber-500 text-amber-500" size={size} />}
                {[...Array(emptyStars)].map((_, i) => (
                    <Star key={`empty-${i}`} className="text-amber-500" size={size} />
                ))}
            </div>
            {showCount && count !== undefined && (
                <span className="text-gray-500 text-sm ml-1">({count.toLocaleString()})</span>
            )}
        </div>
    );
}
