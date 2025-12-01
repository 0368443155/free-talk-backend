"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
    BookOpen,
    Clock,
    Users,
    DollarSign,
    Search,
    Filter,
    Loader2,
    Star,
    Calendar,
    GraduationCap,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { getCoursesApi, getMyCoursesApi, deleteCourseApi, publishCourseApi, unpublishCourseApi, Course, CourseStatus, CourseCategory } from '@/api/courses.rest';
import { useUser } from '@/store/user-store';

export default function CoursesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { userInfo: user } = useUser();

    const [courses, setCourses] = useState<Course[]>([]);
    const [myCourses, setMyCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMyCourses, setLoadingMyCourses] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [activeTab, setActiveTab] = useState('browse');

    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    useEffect(() => {
        loadCourses();
        if (isTeacher) {
            loadMyCourses();
        }
    }, [isTeacher]);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const response = await getCoursesApi();
            // Backend returns: { courses: Course[], total, page, limit, totalPages }
            // Frontend expects: { data: Course[], total, page, limit, totalPages }
            const coursesData = response?.courses || response?.data || (Array.isArray(response) ? response : []);
            setCourses(Array.isArray(coursesData) ? coursesData : []);
        } catch (error: any) {
            console.error('Error loading courses:', error);
            setCourses([]); // Set empty array on error
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to load courses",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadMyCourses = async () => {
        try {
            setLoadingMyCourses(true);
            const data = await getMyCoursesApi();
            setMyCourses(data);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to load your courses",
                variant: "destructive",
            });
        } finally {
            setLoadingMyCourses(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        try {
            await deleteCourseApi(courseToDelete.id);
            toast({
                title: "Success",
                description: "Course deleted successfully",
            });
            setDeleteDialogOpen(false);
            setCourseToDelete(null);
            loadMyCourses();
            // Also reload browse courses in case it was published
            if (activeTab === 'browse') {
                loadCourses();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to delete course",
                variant: "destructive",
            });
        }
    };

    const handleTogglePublish = async (course: Course) => {
        try {
            if (course.is_published) {
                await unpublishCourseApi(course.id);
                toast({
                    title: "Success",
                    description: "Course unpublished successfully",
                });
            } else {
                await publishCourseApi(course.id);
                toast({
                    title: "Success",
                    description: "Course published successfully",
                });
            }
            loadMyCourses();
            if (activeTab === 'browse') {
                loadCourses();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update course",
                variant: "destructive",
            });
        }
    };

    const filteredCourses = (courses || []).filter((course) => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories: string[] = ['all', ...Array.from(new Set((courses || []).map(c => c.category).filter((cat): cat is CourseCategory => cat !== undefined && cat !== null).map(cat => String(cat))))];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Courses</h1>
                            <p className="text-gray-600 mt-2">
                                Discover courses from expert teachers
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {isTeacher && (
                                <Button onClick={() => router.push('/courses/create')}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Course
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => router.push('/student/my-learning')}>
                                <GraduationCap className="w-4 h-4 mr-2" />
                                My Learning
                            </Button>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="mt-6 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                placeholder="Search courses..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedCategory(category === 'all' ? 'all' : String(category))}
                                    className="whitespace-nowrap"
                                >
                                    {category === 'all' ? 'All Categories' : category}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="browse">Browse Courses</TabsTrigger>
                        {isTeacher && (
                            <TabsTrigger value="my-courses">My Own Courses</TabsTrigger>
                        )}
                    </TabsList>

                    {/* Browse Courses Tab */}
                    <TabsContent value="browse">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <Card key={i} className="animate-pulse">
                                        <CardHeader>
                                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : filteredCourses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCourses.map((course) => (
                                    <Card
                                        key={course.id}
                                        className="hover:shadow-lg transition-shadow cursor-pointer"
                                        onClick={() => router.push(`/courses/${course.id}`)}
                                    >
                                        <CardHeader>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="secondary">{course.category || 'General'}</Badge>
                                                {course.level && (
                                                    <Badge variant="outline">{course.level}</Badge>
                                                )}
                                            </div>
                                            <CardTitle className="text-xl">{course.title}</CardTitle>
                                            <CardDescription className="line-clamp-2">
                                                {course.description}
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="space-y-3">
                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <BookOpen className="w-4 h-4" />
                                                    <span>{course.total_sessions} sessions</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{course.duration_hours}h</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>
                                                        {course.current_students}/{course.max_students} students
                                                    </span>
                                                </div>
                                                {course.language && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {course.language}
                                                    </Badge>
                                                )}
                                            </div>

                                            {course.teacher && (
                                                <div className="flex items-center gap-2 pt-2 border-t">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white">
                                                            {course.teacher.username.substring(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {course.teacher.username}
                                                        </p>
                                                        <p className="text-xs text-gray-500">Teacher</p>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>

                                        <CardFooter className="flex justify-between items-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                ${course.price_full_course || course.price_per_session}
                                            </div>
                                            <Button size="sm">
                                                View Details
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No courses found
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {searchTerm
                                            ? `No courses match "${searchTerm}"`
                                            : 'No courses available yet'}
                                    </p>
                                    {searchTerm && (
                                        <Button onClick={() => setSearchTerm('')}>
                                            Clear Search
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* My Own Courses Tab (Teacher/Admin only) */}
                    {isTeacher && (
                        <TabsContent value="my-courses">
                            {loadingMyCourses ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map((i) => (
                                        <Card key={i} className="animate-pulse">
                                            <CardHeader>
                                                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            ) : myCourses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {myCourses.map((course) => (
                                        <Card
                                            key={course.id}
                                            className="hover:shadow-lg transition-shadow"
                                        >
                                            <CardHeader>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex gap-2">
                                                        <Badge variant="secondary">{course.category || 'General'}</Badge>
                                                        {course.is_published ? (
                                                            <Badge variant="default" className="bg-green-500">
                                                                <Eye className="w-3 h-3 mr-1" />
                                                                Published
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">
                                                                <EyeOff className="w-3 h-3 mr-1" />
                                                                Draft
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-xl">{course.title}</CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    {course.description}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent className="space-y-3">
                                                <div className="flex items-center justify-between text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <BookOpen className="w-4 h-4" />
                                                        <span>{course.total_sessions} sessions</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{course.duration_hours}h</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-sm text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        <span>
                                                            {course.current_students}/{course.max_students} students
                                                        </span>
                                                    </div>
                                                    {course.language && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {course.language}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>

                                            <CardFooter className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="text-xl font-bold text-blue-600">
                                                        ${course.price_full_course || course.price_per_session}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/courses/${course.id}?edit=true`);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTogglePublish(course);
                                                        }}
                                                    >
                                                        {course.is_published ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCourseToDelete(course);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="w-full"
                                                    onClick={() => router.push(`/courses/${course.id}`)}
                                                >
                                                    View Details
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            No courses yet
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Create your first course to get started
                                        </p>
                                        <Button onClick={() => router.push('/courses/create')}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Course
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the course
                            "{courseToDelete?.title}" and all its sessions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCourse}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
