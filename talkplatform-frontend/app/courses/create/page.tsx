"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { createCourseWithSessionsApi, MaterialType, CourseLevel, PriceType } from '@/api/courses.rest';
import apiClient from '@/api/axiosConfig';
import { Badge } from '@/components/ui/badge';

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

export default function CreateCoursePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingMaterials, setUploadingMaterials] = useState<Record<string, boolean>>({});

    // Course basic info
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [level, setLevel] = useState<CourseLevel | ''>('');
    const [language, setLanguage] = useState('English');
    const [priceType, setPriceType] = useState<PriceType>(PriceType.PER_SESSION);
    const [pricePerSession, setPricePerSession] = useState<number>(10);
    const [priceFullCourse, setPriceFullCourse] = useState<number>();
    const [maxStudents, setMaxStudents] = useState<number>(30);
    const [durationHours, setDurationHours] = useState<number>(10);

    // Sessions
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [nextSessionNumber, setNextSessionNumber] = useState(1);

    const addSession = () => {
        const newSession: SessionData = {
            id: `session-${Date.now()}`,
            session_number: nextSessionNumber,
            title: '',
            description: '',
            lessons: [],
        };
        setSessions([...sessions, newSession]);
        setNextSessionNumber(nextSessionNumber + 1);
    };

    const addLesson = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const nextLessonNumber = session.lessons.length + 1;
        const newLesson: LessonData = {
            id: `lesson-${Date.now()}`,
            lesson_number: nextLessonNumber,
            title: '',
            description: '',
            scheduled_date: '',
            start_time: '',
            end_time: '',
            materials: [],
        };

        updateSession(sessionId, {
            lessons: [...session.lessons, newLesson],
        });
    };

    const removeLesson = (sessionId: string, lessonId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        updateSession(sessionId, {
            lessons: session.lessons.filter(l => l.id !== lessonId),
        });
    };

    const updateLesson = (sessionId: string, lessonId: string, updates: Partial<LessonData>) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        updateSession(sessionId, {
            lessons: session.lessons.map(l =>
                l.id === lessonId ? { ...l, ...updates } : l
            ),
        });
    };

    const removeSession = (sessionId: string) => {
        setSessions(sessions.filter(s => s.id !== sessionId));
    };

    const updateSession = (sessionId: string, updates: Partial<SessionData>) => {
        setSessions(sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s));
    };

    const addMaterial = (sessionId: string, lessonId: string, type: MaterialType) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const lesson = session.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        const newMaterial: MaterialFile = {
            id: `material-${Date.now()}`,
            file: null,
            type,
            title: '',
            description: '',
            is_required: false,
            display_order: lesson.materials.length,
        };

        updateLesson(sessionId, lessonId, {
            materials: [...lesson.materials, newMaterial],
        });
    };

    const removeMaterial = (sessionId: string, lessonId: string, materialId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const lesson = session.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        updateLesson(sessionId, lessonId, {
            materials: lesson.materials.filter(m => m.id !== materialId),
        });
    };

    const updateMaterial = (sessionId: string, lessonId: string, materialId: string, updates: Partial<MaterialFile>) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const lesson = session.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        updateLesson(sessionId, lessonId, {
            materials: lesson.materials.map(m =>
                m.id === materialId ? { ...m, ...updates } : m
            ),
        });
    };

    const handleFileUpload = async (sessionId: string, lessonId: string, materialId: string, file: File) => {
        setUploadingMaterials(prev => ({ ...prev, [`${sessionId}-${lessonId}-${materialId}`]: true }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Upload to storage
            const response = await apiClient.post('/storage/upload?folder=course-materials', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { url, size, mimeType } = response.data;

            updateMaterial(sessionId, lessonId, materialId, {
                file,
                file_url: url,
                file_name: file.name,
                file_size: size,
                file_type: mimeType,
                uploaded: true,
            });

            toast({
                title: 'File uploaded',
                description: `${file.name} uploaded successfully`,
            });
        } catch (error: any) {
            toast({
                title: 'Upload failed',
                description: error.response?.data?.message || 'Failed to upload file',
                variant: 'destructive',
            });
        } finally {
            setUploadingMaterials(prev => ({ ...prev, [`${sessionId}-${lessonId}-${materialId}`]: false }));
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!title.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Course title is required',
                variant: 'destructive',
            });
            return;
        }

        if (sessions.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'At least one session is required',
                variant: 'destructive',
            });
            return;
        }

        for (const session of sessions) {
            if (!session.title) {
                toast({
                    title: 'Validation Error',
                    description: `Session ${session.session_number} title is required`,
                    variant: 'destructive',
                });
                return;
            }

            if (session.lessons.length === 0) {
                toast({
                    title: 'Validation Error',
                    description: `Session ${session.session_number} must have at least one lesson`,
                    variant: 'destructive',
                });
                return;
            }

            for (const lesson of session.lessons) {
                if (!lesson.title || !lesson.scheduled_date || !lesson.start_time || !lesson.end_time) {
                    toast({
                        title: 'Validation Error',
                        description: `Session ${session.session_number}, Lesson ${lesson.lesson_number} is missing required fields`,
                        variant: 'destructive',
                    });
                    return;
                }
            }
        }

        setIsSubmitting(true);

        try {
            // Upload all materials first
            for (const session of sessions) {
                for (const lesson of session.lessons) {
                    for (const material of lesson.materials) {
                        if (material.file && !material.uploaded) {
                            await handleFileUpload(session.id, lesson.id, material.id, material.file);
                        }
                    }
                }
            }

            // Prepare course data
            const courseData = {
                title,
                description: description || undefined,
                category: category || undefined,
                level: level || undefined,
                language: language || undefined,
                price_per_session: priceType === PriceType.PER_SESSION ? pricePerSession : undefined,
                price_full_course: priceType === PriceType.FULL_COURSE ? priceFullCourse : undefined,
                max_students: maxStudents,
                duration_hours: durationHours,
                sessions: sessions.map(session => ({
                    session_number: session.session_number,
                    title: session.title,
                    description: session.description || undefined,
                    lessons: session.lessons.map(lesson => ({
                        lesson_number: lesson.lesson_number,
                        title: lesson.title,
                        description: lesson.description || undefined,
                        scheduled_date: lesson.scheduled_date,
                        start_time: lesson.start_time,
                        end_time: lesson.end_time,
                        materials: lesson.materials.map(m => ({
                            type: m.type,
                            title: m.title,
                            description: m.description || undefined,
                            file_url: m.file_url,
                            file_name: m.file_name,
                            file_size: m.file_size,
                            file_type: m.file_type,
                            display_order: m.display_order,
                            is_required: m.is_required || false,
                        })),
                    })),
                })),
            };

            const course = await createCourseWithSessionsApi(courseData);

            toast({
                title: 'Success!',
                description: `Course "${course.title}" created successfully with ${sessions.length} sessions`,
            });

            router.push(`/courses/${course.id}`);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create course',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
                    <p className="text-gray-600 mt-2">
                        Create a course with sessions and materials
                    </p>
                </div>

                {/* Course Basic Info */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            Course Information
                        </CardTitle>
                        <CardDescription>
                            Basic information about your course
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="title">Course Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., English Conversation Mastery"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe what students will learn in this course..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 min-h-[100px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="language">Language</Label>
                                <Input
                                    id="language"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="level">Level</Label>
                                <Select value={level} onValueChange={(v) => setLevel(v as CourseLevel)}>
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
                                <Input
                                    id="category"
                                    placeholder="e.g., Language Learning"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="duration">Total Duration (hours) *</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    min="1"
                                    value={durationHours}
                                    onChange={(e) => setDurationHours(parseInt(e.target.value) || 10)}
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
                                    onChange={(e) => setMaxStudents(parseInt(e.target.value) || 30)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Pricing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    onChange={(e) => setPricePerSession(parseFloat(e.target.value) || 10)}
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
                                    onChange={(e) => setPriceFullCourse(parseFloat(e.target.value) || undefined)}
                                    className="mt-1"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Minimum price is $1.00 for the full course
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sessions */}
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Sessions
                                </CardTitle>
                                <CardDescription>
                                    Add sessions with lessons for your course
                                </CardDescription>
                            </div>
                            <Button onClick={addSession} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Session
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {sessions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>No sessions added yet</p>
                                <Button onClick={addSession} variant="outline" className="mt-4">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Session
                                </Button>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <Card key={session.id} className="border-2">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg">
                                                Session {session.session_number}
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeSession(session.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label>Title *</Label>
                                            <Input
                                                value={session.title}
                                                onChange={(e) => updateSession(session.id, { title: e.target.value })}
                                                placeholder="e.g., Week 1 - Basics"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>Description</Label>
                                            <Textarea
                                                value={session.description || ''}
                                                onChange={(e) => updateSession(session.id, { description: e.target.value })}
                                                placeholder="Session description"
                                                className="mt-1"
                                            />
                                        </div>

                                        {/* Lessons Section */}
                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <Label>Lessons</Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addLesson(session.id)}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add Lesson
                                                </Button>
                                            </div>

                                            {session.lessons.length === 0 ? (
                                                <p className="text-sm text-gray-500 text-center py-4">
                                                    No lessons added yet. Add at least one lesson to this session.
                                                </p>
                                            ) : (
                                                <div className="space-y-4">
                                                    {session.lessons.map((lesson) => (
                                                        <Card key={lesson.id} className="border-2 border-blue-100">
                                                            <CardHeader className="pb-3">
                                                                <div className="flex justify-between items-start">
                                                                    <CardTitle className="text-base">
                                                                        Lesson {lesson.lesson_number}
                                                                    </CardTitle>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeLesson(session.id, lesson.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="space-y-3">
                                                                <div>
                                                                    <Label>Lesson Title *</Label>
                                                                    <Input
                                                                        value={lesson.title}
                                                                        onChange={(e) => updateLesson(session.id, lesson.id, { title: e.target.value })}
                                                                        placeholder="e.g., Monday - Introduction"
                                                                        className="mt-1"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <Label>Description</Label>
                                                                    <Textarea
                                                                        value={lesson.description || ''}
                                                                        onChange={(e) => updateLesson(session.id, lesson.id, { description: e.target.value })}
                                                                        placeholder="Lesson description"
                                                                        className="mt-1 min-h-[60px]"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                    <div>
                                                                        <Label>Date *</Label>
                                                                        <Input
                                                                            type="date"
                                                                            value={lesson.scheduled_date}
                                                                            onChange={(e) => updateLesson(session.id, lesson.id, { scheduled_date: e.target.value })}
                                                                            className="mt-1"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label>Start Time *</Label>
                                                                        <Input
                                                                            type="time"
                                                                            value={lesson.start_time}
                                                                            onChange={(e) => updateLesson(session.id, lesson.id, { start_time: e.target.value })}
                                                                            className="mt-1"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label>End Time *</Label>
                                                                        <Input
                                                                            type="time"
                                                                            value={lesson.end_time}
                                                                            onChange={(e) => updateLesson(session.id, lesson.id, { end_time: e.target.value })}
                                                                            className="mt-1"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Lesson Materials */}
                                                                <div className="border-t pt-3">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <Label className="text-sm">Materials</Label>
                                                                        <div className="flex gap-1">
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => addMaterial(session.id, lesson.id, MaterialType.DOCUMENT)}
                                                                            >
                                                                                <FileText className="w-3 h-3 mr-1" />
                                                                                Doc
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => addMaterial(session.id, lesson.id, MaterialType.VIDEO)}
                                                                            >
                                                                                <Video className="w-3 h-3 mr-1" />
                                                                                Video
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => addMaterial(session.id, lesson.id, MaterialType.LINK)}
                                                                            >
                                                                                <LinkIcon className="w-3 h-3 mr-1" />
                                                                                Link
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    {lesson.materials.length === 0 ? (
                                                                        <p className="text-xs text-gray-400 text-center py-2">
                                                                            No materials
                                                                        </p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {lesson.materials.map((material) => (
                                                                                <Card key={material.id} className="p-2 bg-gray-50">
                                                                                    <div className="flex justify-between items-start mb-2">
                                                                                        <Badge variant="secondary" className="text-xs">
                                                                                            {material.type}
                                                                                        </Badge>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => removeMaterial(session.id, lesson.id, material.id)}
                                                                                        >
                                                                                            <X className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </div>

                                                                                    <div className="space-y-2">
                                                                                        <Input
                                                                                            placeholder="Material title *"
                                                                                            value={material.title}
                                                                                            onChange={(e) => updateMaterial(session.id, lesson.id, material.id, { title: e.target.value })}
                                                                                            className="text-sm"
                                                                                        />
                                                                                        <Textarea
                                                                                            placeholder="Description (optional)"
                                                                                            value={material.description || ''}
                                                                                            onChange={(e) => updateMaterial(session.id, lesson.id, material.id, { description: e.target.value })}
                                                                                            className="min-h-[50px] text-sm"
                                                                                        />

                                                                                        {material.type !== MaterialType.LINK && (
                                                                                            <div>
                                                                                                <Label className="text-xs">Upload File</Label>
                                                                                                <div className="border-2 border-dashed rounded-lg p-2 text-center hover:bg-gray-100 transition-colors cursor-pointer relative mt-1">
                                                                                                    <input
                                                                                                        type="file"
                                                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                                                        onChange={(e) => {
                                                                                                            const file = e.target.files?.[0];
                                                                                                            if (file) {
                                                                                                                updateMaterial(session.id, lesson.id, material.id, { file_name: file.name });
                                                                                                                handleFileUpload(session.id, lesson.id, material.id, file);
                                                                                                            }
                                                                                                        }}
                                                                                                        disabled={uploadingMaterials[`${session.id}-${lesson.id}-${material.id}`]}
                                                                                                    />
                                                                                                    <div className="flex flex-col items-center gap-1">
                                                                                                        {uploadingMaterials[`${session.id}-${lesson.id}-${material.id}`] ? (
                                                                                                            <>
                                                                                                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                                                                                                <span className="text-xs text-gray-600">Uploading...</span>
                                                                                                            </>
                                                                                                        ) : material.file_name ? (
                                                                                                            <>
                                                                                                                <Upload className="w-4 h-4 text-green-500" />
                                                                                                                <span className="text-xs font-medium text-green-600">{material.file_name}</span>
                                                                                                            </>
                                                                                                        ) : (
                                                                                                            <>
                                                                                                                <Upload className="w-4 h-4 text-gray-400" />
                                                                                                                <span className="text-xs text-gray-500">Click to upload</span>
                                                                                                            </>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {material.type === MaterialType.LINK && (
                                                                                            <Input
                                                                                                placeholder="URL *"
                                                                                                value={material.file_url || ''}
                                                                                                onChange={(e) => updateMaterial(session.id, lesson.id, material.id, { file_url: e.target.value })}
                                                                                                className="text-sm"
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                </Card>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="min-w-[150px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Course'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

