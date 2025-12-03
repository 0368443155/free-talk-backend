"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import {
    BookOpen,
    Clock,
    Users,
    DollarSign,
    Plus,
    Trash2,
    Upload,
    X,
    ArrowLeft,
    Loader2,
    FileText,
    Video,
    Link as LinkIcon,
    Edit,
    Save,
} from 'lucide-react';
import {
    getCourseByIdApi,
    updateCourseApi,
    updateLessonApi,
    addLessonApi,
    deleteLessonApi,
    Course,
    MaterialType,
    CourseLevel,
    PriceType,
    CourseCategory,
    Lesson,
    LessonMaterial,
    CreateLessonDto,
} from '@/api/courses.rest';
import apiClient from '@/api/axiosConfig';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/store/user-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MaterialFile {
    id: string;
    file?: File | null;
    type: MaterialType;
    title: string;
    description?: string;
    is_required?: boolean;
    display_order: number;
    uploaded?: boolean;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    lesson_material_id?: string; // For existing materials
}

interface LessonData {
    id: string;
    lesson_number: number;
    title: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    materials: MaterialFile[];
}

interface SessionData {
    id: string;
    session_number: number;
    title: string;
    description?: string;
    lessons: LessonData[];
}

export default function EditCoursePage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;
    const { toast } = useToast();
    const { userInfo: user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingMaterials, setUploadingMaterials] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<string>('basic');

    // Course basic info
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<CourseCategory | ''>('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Tags by category
    const tagsByCategory: Record<CourseCategory, string[]> = {
        [CourseCategory.ENGLISH]: ['conversation', 'grammar', 'business-english', 'ielts', 'toefl', 'pronunciation', 'writing', 'reading'],
        [CourseCategory.MARKETING]: ['digital-marketing', 'social-media', 'seo', 'content-marketing', 'email-marketing', 'analytics', 'branding', 'advertising'],
        [CourseCategory.BUSINESS]: ['management', 'leadership', 'entrepreneurship', 'finance', 'strategy', 'negotiation', 'sales', 'consulting'],
        [CourseCategory.TECHNOLOGY]: ['programming', 'web-development', 'mobile-app', 'data-science', 'ai', 'cybersecurity', 'cloud-computing', 'blockchain'],
        [CourseCategory.DESIGN]: ['ui-ux', 'graphic-design', 'web-design', 'illustration', 'photography', 'video-editing', '3d-modeling', 'animation'],
        [CourseCategory.HEALTH]: ['nutrition', 'mental-health', 'wellness', 'yoga', 'meditation', 'first-aid', 'public-health', 'alternative-medicine'],
        [CourseCategory.FITNESS]: ['weight-training', 'cardio', 'yoga', 'pilates', 'crossfit', 'running', 'swimming', 'dance'],
        [CourseCategory.MUSIC]: ['guitar', 'piano', 'violin', 'singing', 'music-theory', 'composition', 'production', 'dj'],
        [CourseCategory.ARTS]: ['painting', 'drawing', 'sculpture', 'ceramics', 'printmaking', 'art-history', 'art-therapy', 'calligraphy'],
        [CourseCategory.SCIENCE]: ['biology', 'chemistry', 'physics', 'astronomy', 'environmental-science', 'research-methods', 'lab-skills', 'scientific-writing'],
        [CourseCategory.MATHEMATICS]: ['algebra', 'calculus', 'statistics', 'geometry', 'probability', 'linear-algebra', 'discrete-math', 'applied-math'],
        [CourseCategory.LANGUAGES]: ['spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'italian', 'portuguese'],
        [CourseCategory.OTHER]: ['personal-development', 'cooking', 'photography', 'travel', 'writing', 'communication', 'time-management', 'creativity'],
    };

    const availableTags = category ? tagsByCategory[category] || [] : [];

    const handleAddTag = (tag: string) => {
        const trimmedTag = tag.trim().toLowerCase();
        if (trimmedTag && trimmedTag.length <= 20 && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            handleAddTag(tagInput);
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };
    const [level, setLevel] = useState<CourseLevel | ''>('');
    const [language, setLanguage] = useState('English');
    const [priceType, setPriceType] = useState<PriceType>(PriceType.PER_SESSION);
    const [pricePerSession, setPricePerSession] = useState<number>(10);
    const [priceFullCourse, setPriceFullCourse] = useState<number>(0);
    const [maxStudents, setMaxStudents] = useState<number>(30);
    const [durationHours, setDurationHours] = useState<number>(10);
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [thumbnailMode, setThumbnailMode] = useState<'url' | 'upload'>('url');
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);


    // Sessions
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [originalCourse, setOriginalCourse] = useState<Course | null>(null);

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const loadCourse = async () => {
        try {
            setLoading(true);
            const course = await getCourseByIdApi(courseId);
            setOriginalCourse(course);

            // Check if user is the teacher
            if (course.teacher_id !== user?.id && user?.role !== 'admin') {
                toast({
                    title: "Access Denied",
                    description: "You can only edit your own courses",
                    variant: "destructive",
                });
                router.push(`/courses/${courseId}`);
                return;
            }

            // Populate form with course data
            setTitle(course.title || '');
            setDescription(course.description || '');
            setCategory(course.category as CourseCategory || '');
            setTags(course.tags || []);
            setLevel(course.level || '');
            setLanguage(course.language || 'English');
            setPriceType(course.price_type || PriceType.PER_SESSION);
            setPricePerSession(course.price_per_session || 0);
            setPriceFullCourse(course.price_full_course || 0);
            setMaxStudents(course.max_students || 30);
            setDurationHours(course.duration_hours || 10);
            setThumbnailUrl(course.thumbnail_url || '');
            setIsFree((course.price_per_session === 0 || !course.price_per_session) && (course.price_full_course === 0 || !course.price_full_course));


            // Convert sessions to SessionData format
            if (course.sessions && course.sessions.length > 0) {
                const sessionData: SessionData[] = course.sessions.map((session) => ({
                    id: session.id,
                    session_number: session.session_number,
                    title: session.title || '',
                    description: session.description || '',
                    lessons: (session.lessons || []).map((lesson: Lesson) => ({
                        id: lesson.id,
                        lesson_number: lesson.lesson_number,
                        title: lesson.title,
                        description: lesson.description || '',
                        scheduled_date: lesson.scheduled_date ? new Date(lesson.scheduled_date).toISOString().split('T')[0] : '',
                        start_time: lesson.start_time || '',
                        end_time: lesson.end_time || '',
                        materials: (lesson.materials || []).map((material: LessonMaterial, index: number) => ({
                            id: `material-${material.id}`,
                            type: material.type as MaterialType,
                            title: material.title,
                            description: material.description || '',
                            is_required: material.is_required || false,
                            display_order: material.display_order || index + 1,
                            uploaded: true,
                            file_url: material.file_url,
                            file_name: material.file_name,
                            file_size: material.file_size,
                            file_type: material.file_type,
                            lesson_material_id: material.id,
                        })),
                    })),
                }));
                setSessions(sessionData);
            }
        } catch (error: any) {
            console.error('Failed to load course:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to load course",
                variant: "destructive",
            });
            router.push(`/courses/${courseId}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCourse = async () => {
        try {
            setIsSubmitting(true);

            // Update course basic info
            await updateCourseApi(courseId, {
                title,
                description,
                category: category || undefined,
                tags,
                level: level as CourseLevel,
                language,
                price_type: priceType,
                price_per_session: priceType === PriceType.PER_SESSION && !isFree ? pricePerSession : 0,
                price_full_course: priceType === PriceType.FULL_COURSE && !isFree ? priceFullCourse : 0,
                max_students: maxStudents,
                duration_hours: durationHours,
                thumbnail_url: thumbnailUrl || undefined,
            });

            toast({
                title: "Success!",
                description: "Course updated successfully",
            });

            router.push(`/courses/${courseId}`);
        } catch (error: any) {
            console.error('Failed to update course:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update course",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLesson = async (sessionId: string, lesson: LessonData) => {
        try {
            // Upload any new materials first
            for (const material of lesson.materials || []) {
                if (material.file && !material.uploaded) {
                    await handleFileUpload(lesson.id, material.id, material.file);
                }
            }

            // Prepare materials data
            const materialsData = (lesson.materials || []).map((material, index) => ({
                type: material.type,
                title: material.title,
                description: material.description || undefined,
                file_url: material.file_url || undefined,
                file_name: material.file_name || undefined,
                file_size: material.file_size || undefined,
                file_type: material.file_type || undefined,
                display_order: material.display_order || index,
                is_required: material.is_required || false,
            }));

            await updateLessonApi(courseId, sessionId, lesson.id, {
                title: lesson.title,
                description: lesson.description,
                scheduled_date: lesson.scheduled_date,
                start_time: lesson.start_time,
                end_time: lesson.end_time,
                materials: materialsData,
            });

            toast({
                title: "Success!",
                description: "Lesson updated successfully",
            });

            // Reload course to get updated data
            await loadCourse();

            // Keep the lessons tab active
            setActiveTab('lessons');
        } catch (error: any) {
            console.error('Failed to update lesson:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update lesson",
                variant: "destructive",
            });
        }
    };

    const handleDeleteLesson = async (sessionId: string, lessonId: string) => {
        if (!confirm('Are you sure you want to delete this lesson?')) {
            return;
        }

        try {
            await deleteLessonApi(courseId, sessionId, lessonId);
            toast({
                title: "Success!",
                description: "Lesson deleted successfully",
            });

            // Reload course to get updated data
            await loadCourse();

            // Keep the lessons tab active
            setActiveTab('lessons');
        } catch (error: any) {
            console.error('Failed to delete lesson:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to delete lesson",
                variant: "destructive",
            });
        }
    };

    const handleAddLesson = async (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const nextLessonNumber = session.lessons.length + 1;
        const today = new Date().toISOString().split('T')[0];

        try {
            const newLesson = await addLessonApi(courseId, sessionId, {
                lesson_number: nextLessonNumber,
                title: `Lesson ${nextLessonNumber}`,
                description: '',
                scheduled_date: today,
                start_time: '09:00',
                end_time: '10:00',
                materials: [],
            });

            toast({
                title: "Success!",
                description: "Lesson added successfully",
            });

            // Reload course to get updated data
            await loadCourse();

            // Keep the lessons tab active
            setActiveTab('lessons');
        } catch (error: any) {
            console.error('Failed to add lesson:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to add lesson",
                variant: "destructive",
            });
        }
    };

    const handleAddMaterial = (sessionId: string, lessonId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const lesson = session.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        const newMaterial: MaterialFile = {
            id: `material-${Date.now()}`,
            file: null,
            type: MaterialType.DOCUMENT,
            title: '',
            description: '',
            is_required: false,
            display_order: (lesson.materials || []).length,
            uploaded: false,
        };

        setSessions(prev =>
            prev.map(s =>
                s.id === sessionId
                    ? {
                        ...s,
                        lessons: s.lessons.map(l =>
                            l.id === lessonId
                                ? { ...l, materials: [...(l.materials || []), newMaterial] }
                                : l
                        ),
                    }
                    : s
            )
        );
    };

    const handleRemoveMaterial = (sessionId: string, lessonId: string, materialId: string) => {
        setSessions(prev =>
            prev.map(s =>
                s.id === sessionId
                    ? {
                        ...s,
                        lessons: s.lessons.map(l =>
                            l.id === lessonId
                                ? { ...l, materials: (l.materials || []).filter(m => m.id !== materialId) }
                                : l
                        ),
                    }
                    : s
            )
        );
    };

    const handleUpdateMaterial = (sessionId: string, lessonId: string, materialId: string, updates: Partial<MaterialFile>) => {
        setSessions(prev =>
            prev.map(s =>
                s.id === sessionId
                    ? {
                        ...s,
                        lessons: s.lessons.map(l =>
                            l.id === lessonId
                                ? {
                                    ...l,
                                    materials: (l.materials || []).map(m =>
                                        m.id === materialId ? { ...m, ...updates } : m
                                    ),
                                }
                                : l
                        ),
                    }
                    : s
            )
        );
    };

    const handleThumbnailUpload = async (file: File) => {
        setUploadingThumbnail(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/storage/upload?folder=course-thumbnails', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const fileUrl = response.data.url;
            setThumbnailUrl(fileUrl);

            toast({
                title: "Success!",
                description: "Thumbnail uploaded successfully",
            });
        } catch (error: any) {
            console.error('Failed to upload thumbnail:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to upload thumbnail",
                variant: "destructive",
            });
        } finally {
            setUploadingThumbnail(false);
        }
    };

    const handleFileUpload = async (lessonId: string, materialId: string, file: File) => {
        const uploadKey = `${lessonId}-${materialId}`;
        setUploadingMaterials(prev => ({ ...prev, [uploadKey]: true }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post('/storage/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const fileUrl = response.data.url;

            // Update material in state
            setSessions(prevSessions =>
                prevSessions.map(session =>
                ({
                    ...session,
                    lessons: session.lessons.map(lesson =>
                        lesson.id === lessonId
                            ? {
                                ...lesson,
                                materials: (lesson.materials || []).map(m =>
                                    m.id === materialId
                                        ? { ...m, file_url: fileUrl, file_name: file.name, uploaded: true }
                                        : m
                                ),
                            }
                            : lesson
                    ),
                })
                )
            );

            toast({
                title: "Success!",
                description: "File uploaded successfully",
            });
        } catch (error: any) {
            console.error('Failed to upload file:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to upload file",
                variant: "destructive",
            });
        } finally {
            setUploadingMaterials(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/courses/${courseId}`)}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Course
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
                    <p className="text-gray-600 mt-2">Update your course information and lessons</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="basic">Basic Information</TabsTrigger>
                        <TabsTrigger value="lessons">Lessons</TabsTrigger>
                    </TabsList>

                    {/* Basic Information Tab */}
                    <TabsContent value="basic">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    Course Information
                                </CardTitle>
                                <CardDescription>Update basic course details</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Course Title *</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter course title"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter course description"
                                        rows={4}
                                    />
                                </div>

                                {/* Thumbnail */}
                                <div className="space-y-2">
                                    <Label htmlFor="thumbnail">Course Thumbnail</Label>
                                    <RadioGroup
                                        value={thumbnailMode}
                                        onValueChange={(value) => {
                                            setThumbnailMode(value as 'url' | 'upload');
                                            if (value === 'upload') {
                                                setThumbnailUrl('');
                                            }
                                        }}
                                        className="mt-2"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="url" id="thumbnail-url" />
                                            <Label htmlFor="thumbnail-url" className="font-normal cursor-pointer">
                                                Use Image URL
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="upload" id="thumbnail-upload" />
                                            <Label htmlFor="thumbnail-upload" className="font-normal cursor-pointer">
                                                Upload Image
                                            </Label>
                                        </div>
                                    </RadioGroup>

                                    {thumbnailMode === 'url' ? (
                                        <>
                                            <Input
                                                id="thumbnail"
                                                type="url"
                                                placeholder="https://example.com/image.jpg"
                                                value={thumbnailUrl}
                                                onChange={(e) => setThumbnailUrl(e.target.value)}
                                                className="mt-2"
                                            />
                                            {thumbnailUrl && (
                                                <div className="mt-2">
                                                    <img
                                                        src={thumbnailUrl}
                                                        alt="Thumbnail preview"
                                                        className="w-32 h-32 object-cover rounded border"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <p className="text-sm text-gray-500 mt-1">
                                                Provide a URL to an image for your course thumbnail
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            // Validate file type
                                                            if (!file.type.startsWith('image/')) {
                                                                toast({
                                                                    title: "Error",
                                                                    description: "Please select an image file",
                                                                    variant: "destructive",
                                                                });
                                                                return;
                                                            }
                                                            // Validate file size (max 5MB)
                                                            if (file.size > 5 * 1024 * 1024) {
                                                                toast({
                                                                    title: "Error",
                                                                    description: "Image size must be less than 5MB",
                                                                    variant: "destructive",
                                                                });
                                                                return;
                                                            }
                                                            handleThumbnailUpload(file);
                                                        }
                                                    }}
                                                    disabled={uploadingThumbnail}
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    {uploadingThumbnail ? (
                                                        <>
                                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                                            <span className="text-sm text-gray-600">Uploading...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-gray-400" />
                                                            <span className="text-sm text-gray-600">
                                                                Click to upload or drag and drop
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                PNG, JPG, GIF up to 5MB
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {thumbnailUrl && (
                                                <div className="mt-2">
                                                    <img
                                                        src={thumbnailUrl}
                                                        alt="Thumbnail preview"
                                                        className="w-32 h-32 object-cover rounded border"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="language">Language</Label>
                                        <Input
                                            id="language"
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            placeholder="e.g., English"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="level">Level</Label>
                                        <Select value={level} onValueChange={(value) => setLevel(value as CourseLevel)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={CourseLevel.BEGINNER}>Beginner</SelectItem>
                                                <SelectItem value={CourseLevel.INTERMEDIATE}>Intermediate</SelectItem>
                                                <SelectItem value={CourseLevel.ADVANCED}>Advanced</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="category">Category</Label>
                                        <Select
                                            value={category}
                                            onValueChange={(value) => {
                                                setCategory(value as CourseCategory);
                                                setTags([]); // Clear tags when category changes
                                            }}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(CourseCategory).map((cat) => (
                                                    <SelectItem key={cat} value={cat}>
                                                        {cat}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Tags - show only if category selected */}
                                {category && (
                                    <div>
                                        <Label htmlFor="tags">Tags</Label>
                                        <div className="mt-1 space-y-2">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                                        {tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveTag(tag)}
                                                            className="ml-1 hover:text-red-500"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="tags"
                                                    placeholder="Type a tag and press Enter (max 20 chars)"
                                                    value={tagInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.length <= 20) {
                                                            setTagInput(value);
                                                        }
                                                    }}
                                                    onKeyDown={handleTagInputKeyDown}
                                                    maxLength={20}
                                                />
                                                {availableTags.length > 0 && (
                                                    <Select
                                                        value=""
                                                        onValueChange={(value) => {
                                                            if (value && !tags.includes(value)) {
                                                                handleAddTag(value);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-[200px]">
                                                            <SelectValue placeholder="Select from list" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableTags
                                                                .filter(tag => !tags.includes(tag))
                                                                .map((tag) => (
                                                                    <SelectItem key={tag} value={tag}>
                                                                        {tag}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                            {tagInput.length > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    {tagInput.length}/20 characters
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="duration">
                                            <Clock className="w-4 h-4 inline mr-1" />
                                            Total Duration (hours) *
                                        </Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min="1"
                                            value={durationHours}
                                            onChange={(e) => setDurationHours(Number(e.target.value))}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="maxStudents">
                                            <Users className="w-4 h-4 inline mr-1" />
                                            Max Students
                                        </Label>
                                        <Input
                                            id="maxStudents"
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={maxStudents}
                                            onChange={(e) => setMaxStudents(Number(e.target.value))}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pricing Card */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Pricing
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Free Course Toggle */}
                                <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg border border-green-200">
                                    <input
                                        type="checkbox"
                                        id="is-free"
                                        checked={isFree}
                                        onChange={(e) => {
                                            setIsFree(e.target.checked);
                                            if (e.target.checked) {
                                                setPricePerSession(0);
                                                setPriceFullCourse(0);
                                            } else {
                                                setPricePerSession(10);
                                            }
                                        }}
                                        className="w-4 h-4 text-green-600"
                                    />
                                    <Label htmlFor="is-free" className="font-medium cursor-pointer">
                                        This is a FREE course
                                    </Label>
                                </div>

                                {!isFree && (
                                    <>
                                        <div>
                                            <Label>Pricing Model *</Label>
                                            <RadioGroup
                                                value={priceType}
                                                onValueChange={(v) => setPriceType(v as PriceType)}
                                                className="mt-2"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value={PriceType.PER_SESSION} id="per-session" />
                                                    <Label htmlFor="per-session" className="font-normal cursor-pointer">
                                                        Per Session - Students can buy individual sessions
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value={PriceType.FULL_COURSE} id="full-course" />
                                                    <Label htmlFor="full-course" className="font-normal cursor-pointer">
                                                        Full Course - Students must buy the entire course
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        {priceType === PriceType.PER_SESSION ? (
                                            <div>
                                                <Label htmlFor="pricePerSession">Price per Session (USD) *</Label>
                                                <Input
                                                    id="pricePerSession"
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={pricePerSession}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        setPricePerSession(isNaN(value) ? 0 : value);
                                                    }}
                                                    className="mt-1"
                                                />
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Minimum price is $1.00 per session
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Label htmlFor="priceFullCourse">Full Course Price (USD) *</Label>
                                                <Input
                                                    id="priceFullCourse"
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={priceFullCourse || ''}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        setPriceFullCourse(isNaN(value) ? 0 : value);
                                                    }}
                                                    className="mt-1"
                                                />
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Minimum price is $1.00 for the full course
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Save Button */}
                        <div className="flex justify-end gap-4">
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/courses/${courseId}`)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateCourse}
                                disabled={isSubmitting}
                                className="min-w-[150px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Lessons Tab */}
                    <TabsContent value="lessons">
                        <div className="space-y-6">
                            {sessions.map((session) => (
                                <Card key={session.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle>Session {session.session_number}: {session.title || 'Untitled'}</CardTitle>
                                                <CardDescription>{session.description || 'No description'}</CardDescription>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAddLesson(session.id)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Lesson
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {session.lessons.map((lesson) => (
                                            <Card key={lesson.id} className="bg-gray-50">
                                                <CardContent className="pt-6 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Lesson Title</Label>
                                                            <Input
                                                                value={lesson.title}
                                                                onChange={(e) => {
                                                                    setSessions(prev =>
                                                                        prev.map(s =>
                                                                            s.id === session.id
                                                                                ? {
                                                                                    ...s,
                                                                                    lessons: s.lessons.map(l =>
                                                                                        l.id === lesson.id
                                                                                            ? { ...l, title: e.target.value }
                                                                                            : l
                                                                                    ),
                                                                                }
                                                                                : s
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Description</Label>
                                                        <Textarea
                                                            value={lesson.description || ''}
                                                            onChange={(e) => {
                                                                setSessions(prev =>
                                                                    prev.map(s =>
                                                                        s.id === session.id
                                                                            ? {
                                                                                ...s,
                                                                                lessons: s.lessons.map(l =>
                                                                                    l.id === lesson.id
                                                                                        ? { ...l, description: e.target.value }
                                                                                        : l
                                                                                ),
                                                                            }
                                                                            : s
                                                                    )
                                                                );
                                                            }}
                                                            placeholder="Enter lesson description..."
                                                            rows={4}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Scheduled Date</Label>
                                                            <Input
                                                                type="date"
                                                                value={lesson.scheduled_date}
                                                                onChange={(e) => {
                                                                    setSessions(prev =>
                                                                        prev.map(s =>
                                                                            s.id === session.id
                                                                                ? {
                                                                                    ...s,
                                                                                    lessons: s.lessons.map(l =>
                                                                                        l.id === lesson.id
                                                                                            ? { ...l, scheduled_date: e.target.value }
                                                                                            : l
                                                                                    ),
                                                                                }
                                                                                : s
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Start Time</Label>
                                                            <Input
                                                                type="time"
                                                                value={lesson.start_time}
                                                                onChange={(e) => {
                                                                    setSessions(prev =>
                                                                        prev.map(s =>
                                                                            s.id === session.id
                                                                                ? {
                                                                                    ...s,
                                                                                    lessons: s.lessons.map(l =>
                                                                                        l.id === lesson.id
                                                                                            ? { ...l, start_time: e.target.value }
                                                                                            : l
                                                                                    ),
                                                                                }
                                                                                : s
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>End Time</Label>
                                                            <Input
                                                                type="time"
                                                                value={lesson.end_time}
                                                                onChange={(e) => {
                                                                    setSessions(prev =>
                                                                        prev.map(s =>
                                                                            s.id === session.id
                                                                                ? {
                                                                                    ...s,
                                                                                    lessons: s.lessons.map(l =>
                                                                                        l.id === lesson.id
                                                                                            ? { ...l, end_time: e.target.value }
                                                                                            : l
                                                                                    ),
                                                                                }
                                                                                : s
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleUpdateLesson(session.id, lesson)}
                                                        >
                                                            <Save className="w-4 h-4 mr-2" />
                                                            Save Lesson
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDeleteLesson(session.id, lesson.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </Button>
                                                    </div>

                                                    {/* Materials */}
                                                    <div className="mt-4 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Label>Materials</Label>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleAddMaterial(session.id, lesson.id)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Add Material
                                                            </Button>
                                                        </div>
                                                        {lesson.materials && lesson.materials.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {lesson.materials.map((material, index) => (
                                                                    <Card key={material.id} className="p-3 bg-white">
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <FileText className="w-4 h-4 text-gray-500" />
                                                                                <Input
                                                                                    placeholder="Material title"
                                                                                    value={material.title}
                                                                                    onChange={(e) => handleUpdateMaterial(session.id, lesson.id, material.id, { title: e.target.value })}
                                                                                    className="flex-1"
                                                                                />
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    onClick={() => handleRemoveMaterial(session.id, lesson.id, material.id)}
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                            <Textarea
                                                                                placeholder="Material description (optional)"
                                                                                value={material.description || ''}
                                                                                onChange={(e) => handleUpdateMaterial(session.id, lesson.id, material.id, { description: e.target.value })}
                                                                                rows={2}
                                                                            />
                                                                            <div className="flex items-center gap-2">
                                                                                <Select
                                                                                    value={material.type}
                                                                                    onValueChange={(value) => handleUpdateMaterial(session.id, lesson.id, material.id, { type: value as MaterialType })}
                                                                                >
                                                                                    <SelectTrigger className="w-[150px]">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value={MaterialType.DOCUMENT}>Document</SelectItem>
                                                                                        <SelectItem value={MaterialType.VIDEO}>Video</SelectItem>
                                                                                        <SelectItem value={MaterialType.LINK}>Link</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                                {material.type === MaterialType.LINK ? (
                                                                                    <Input
                                                                                        placeholder="Enter URL"
                                                                                        value={material.file_url || ''}
                                                                                        onChange={(e) => handleUpdateMaterial(session.id, lesson.id, material.id, { file_url: e.target.value })}
                                                                                        className="flex-1"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="flex-1">
                                                                                        {material.uploaded && material.file_url ? (
                                                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                                                <FileText className="w-4 h-4" />
                                                                                                <span className="truncate">{material.file_name || 'File uploaded'}</span>
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="ghost"
                                                                                                    onClick={() => handleUpdateMaterial(session.id, lesson.id, material.id, { uploaded: false, file_url: undefined, file_name: undefined })}
                                                                                                >
                                                                                                    Change
                                                                                                </Button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <Input
                                                                                                type="file"
                                                                                                onChange={(e) => {
                                                                                                    const file = e.target.files?.[0];
                                                                                                    if (file) {
                                                                                                        handleFileUpload(lesson.id, material.id, file);
                                                                                                    }
                                                                                                }}
                                                                                                className="w-full"
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={material.is_required || false}
                                                                                        onChange={(e) => handleUpdateMaterial(session.id, lesson.id, material.id, { is_required: e.target.checked })}
                                                                                        className="w-4 h-4"
                                                                                    />
                                                                                    <Label className="text-xs">Required</Label>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 italic">No materials added yet</p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

