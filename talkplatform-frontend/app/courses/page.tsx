"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
    Search,
    Filter,
    Loader2,
    Plus,
    X,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { getCoursesApi, getMyCoursesApi, deleteCourseApi, publishCourseApi, unpublishCourseApi, Course, CourseCategory, CourseLevel } from '@/api/courses.rest';
import { useUser } from '@/store/user-store';
import { CourseCardUdemy } from '@/components/courses/course-card-udemy';

export default function CoursesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { userInfo: user } = useUser();

    const [courses, setCourses] = useState<Course[]>([]);
    const [myCourses, setMyCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMyCourses, setLoadingMyCourses] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState<{ min: number, max: number } | null>(null);

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
            const coursesData = response?.courses || response?.data || (Array.isArray(response) ? response : []);
            setCourses(Array.isArray(coursesData) ? coursesData : []);
        } catch (error: any) {
            console.error('Error loading courses:', error);
            setCourses([]);
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

    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleLevelChange = (level: string) => {
        setSelectedLevels(prev =>
            prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level]
        );
    };

    const filteredCourses = (courses || []).filter((course) => {
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategories.length === 0 ||
            (course.category && selectedCategories.includes(course.category));

        const matchesLevel = selectedLevels.length === 0 ||
            (course.level && selectedLevels.includes(course.level));

        return matchesSearch && matchesCategory && matchesLevel;
    });

    const categories = Object.values(CourseCategory);
    const levels = Object.values(CourseLevel);

    const FilterSidebar = () => (
        <div className="space-y-6">
            <Accordion type="multiple" defaultValue={["categories", "levels", "price"]} className="w-full">
                <AccordionItem value="categories">
                    <AccordionTrigger className="text-lg font-bold">Category</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-2">
                            {categories.map((category) => (
                                <div key={category} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`cat-${category}`}
                                        checked={selectedCategories.includes(category)}
                                        onCheckedChange={() => handleCategoryChange(category)}
                                    />
                                    <Label htmlFor={`cat-${category}`} className="text-sm font-normal cursor-pointer">
                                        {category}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="levels">
                    <AccordionTrigger className="text-lg font-bold">Level</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-2">
                            {levels.map((level) => (
                                <div key={level} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`level-${level}`}
                                        checked={selectedLevels.includes(level)}
                                        onCheckedChange={() => handleLevelChange(level)}
                                    />
                                    <Label htmlFor={`level-${level}`} className="text-sm font-normal cursor-pointer capitalize">
                                        {level}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="price">
                    <AccordionTrigger className="text-lg font-bold">Price</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="price-free" />
                                <Label htmlFor="price-free" className="text-sm font-normal cursor-pointer">Free</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="price-paid" />
                                <Label htmlFor="price-paid" className="text-sm font-normal cursor-pointer">Paid</Label>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            {/* Header / Hero */}
            <div className="bg-gray-50 border-b">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">All Courses</h1>
                        {isTeacher && (
                            <Button onClick={() => router.push('/courses/create')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Course
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <TabsList>
                            <TabsTrigger value="browse">Browse</TabsTrigger>
                            {isTeacher && <TabsTrigger value="my-courses">My Courses</TabsTrigger>}
                        </TabsList>

                        {/* Mobile Filter Button */}
                        <div className="md:hidden w-full flex gap-2">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="flex-1">
                                        <Filter className="w-4 h-4 mr-2" />
                                        Filters
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left">
                                    <SheetHeader>
                                        <SheetTitle>Filters</SheetTitle>
                                        <SheetDescription>Refine your course search</SheetDescription>
                                    </SheetHeader>
                                    <div className="mt-6">
                                        <FilterSidebar />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>

                    <TabsContent value="browse" className="mt-0">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Sidebar (Desktop) */}
                            <div className="hidden md:block w-64 flex-shrink-0">
                                <FilterSidebar />
                            </div>

                            {/* Main Content */}
                            <div className="flex-1">
                                {/* Search Bar */}
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <Input
                                        placeholder="Search for courses..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-12 text-lg"
                                    />
                                </div>

                                {/* Results Count */}
                                <div className="mb-4 text-gray-600 font-medium">
                                    {filteredCourses.length} results
                                </div>

                                {/* Course Grid */}
                                {loading ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <div key={i} className="h-80 bg-gray-100 animate-pulse rounded-lg"></div>
                                        ))}
                                    </div>
                                ) : filteredCourses.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredCourses.map((course) => (
                                            <CourseCardUdemy key={course.id} course={course} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                        <h3 className="text-lg font-medium text-gray-900">No courses found</h3>
                                        <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                                        <Button
                                            variant="link"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setSelectedCategories([]);
                                                setSelectedLevels([]);
                                            }}
                                            className="mt-2"
                                        >
                                            Clear all filters
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {isTeacher && (
                        <TabsContent value="my-courses">
                            {/* Reuse existing My Courses layout or update it similarly */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myCourses.map((course) => (
                                    <CourseCardUdemy
                                        key={course.id}
                                        course={course}
                                        onClick={() => router.push(`/courses/${course.id}?edit=true`)}
                                    />
                                ))}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}
