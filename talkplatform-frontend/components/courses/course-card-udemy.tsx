import { Course } from "@/api/courses.rest";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

interface CourseCardUdemyProps {
    course: Course;
    onClick?: () => void;
}

export function CourseCardUdemy({ course, onClick }: CourseCardUdemyProps) {
    const router = useRouter();

    const isBestseller = course.current_students > 100;
    const isNew =
        new Date(course.created_at) >
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            router.push(`/courses/${course.id}`);
        }
    };

    return (
        <Card
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col border-gray-200"
            onClick={handleClick}
        >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200 overflow-hidden">
                {course.thumbnail_url ? (
                    <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                        <BookOpen className="w-16 h-16 text-white opacity-50" />
                    </div>
                )}
                {course.level && (
                    <Badge className="absolute top-2 right-2 bg-white text-gray-900">
                        {course.level}
                    </Badge>
                )}
            </div>

            {/* Content */}
            <CardContent className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                    {course.title}
                </h3>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {course.description || "No description available"}
                </p>

                <div className="text-sm text-gray-500 mb-2">
                    {course.teacher?.username || "Unknown Instructor"}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-sm text-gray-900">
                        {course.average_rating > 0
                            ? course.average_rating.toFixed(1)
                            : "New"}
                    </span>
                    <StarRating rating={course.average_rating} size={14} />
                    <span className="text-xs text-gray-500">
                        ({course.total_reviews})
                    </span>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto">
                    <span>{course.total_sessions} lectures</span>
                    <span>•</span>
                    <span>{course.duration_hours}h total</span>
                    {course.level && (
                        <>
                            <span>•</span>
                            <span>{course.level}</span>
                        </>
                    )}
                </div>

                {/* Badges */}
                <div className="mt-2 flex gap-2">
                    {isBestseller && (
                        <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-[10px] px-2 py-0 h-5"
                        >
                            Bestseller
                        </Badge>
                    )}
                    {isNew && (
                        <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 hover:bg-green-200 text-[10px] px-2 py-0 h-5"
                        >
                            New
                        </Badge>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 mt-auto">
                <div className="flex items-center gap-2">
                    {course.price_full_course === 0 && course.price_per_session === 0 ? (
                        <span className="font-bold text-lg text-green-600">Free</span>
                    ) : (
                        <>
                            <span className="font-bold text-lg">
                                ${course.price_full_course || course.price_per_session || 0}
                            </span>
                            {(course.price_full_course || 0) > 0 && (
                                <span className="text-sm text-gray-500 line-through">
                                    ${((course.price_full_course || 0) * 1.2).toFixed(2)}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
