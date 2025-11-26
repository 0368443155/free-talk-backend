'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { createCourseApi, PriceType, CourseLevel } from '@/api/courses.rest';
import { Loader2, BookOpen, DollarSign, Clock, Users } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    duration_hours: z.coerce.number().min(1, 'Duration must be at least 1 hour'),
    total_sessions: z.coerce.number().min(1, 'Must have at least 1 session'),
    price_type: z.enum([PriceType.PER_SESSION, PriceType.FULL_COURSE]),
    price_per_session: z.coerce.number().min(1, 'Price must be at least $1').optional(),
    price_full_course: z.coerce.number().min(1, 'Price must be at least $1').optional(),
    language: z.string().optional(),
    level: z.enum([CourseLevel.BEGINNER, CourseLevel.INTERMEDIATE, CourseLevel.ADVANCED]).optional(),
    category: z.string().optional(),
    max_students: z.coerce.number().min(1).max(100).optional(),
}).refine((data) => {
    if (data.price_type === PriceType.PER_SESSION) {
        return data.price_per_session && data.price_per_session >= 1;
    }
    if (data.price_type === PriceType.FULL_COURSE) {
        return data.price_full_course && data.price_full_course >= 1;
    }
    return true;
}, {
    message: 'Price is required based on pricing type',
    path: ['price_per_session'],
});

export function CreateCourseForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            duration_hours: 10,
            total_sessions: 5,
            price_type: PriceType.PER_SESSION,
            price_per_session: 10,
            language: 'English',
            level: CourseLevel.BEGINNER,
            category: 'Language Learning',
            max_students: 20,
        },
    });

    const priceType = form.watch('price_type');

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsSubmitting(true);

            const course = await createCourseApi(values);

            toast({
                title: 'Course created successfully!',
                description: `${course.title} has been created with QR code and share link.`,
            });

            // Redirect to course detail page
            router.push(`/courses/${course.id}`);
        } catch (error: any) {
            console.error('Failed to create course:', error);
            toast({
                title: 'Failed to create course',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <BookOpen className="h-6 w-6" />
                    Create New Course
                </CardTitle>
                <CardDescription>
                    Fill in the details below to create a new course. A QR code and share link will be generated automatically.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Basic Information</h3>

                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Title *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., English Conversation Mastery" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe what students will learn in this course..."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="language"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Language</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., English" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Level</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={CourseLevel.BEGINNER}>Beginner</SelectItem>
                                                    <SelectItem value={CourseLevel.INTERMEDIATE}>Intermediate</SelectItem>
                                                    <SelectItem value={CourseLevel.ADVANCED}>Advanced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Language Learning" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Course Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Course Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="duration_hours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total Duration (hours) *</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="total_sessions"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total Sessions *</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="max_students"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                <Users className="h-4 w-4 inline mr-1" />
                                                Max Students
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Pricing
                            </h3>

                            <FormField
                                control={form.control}
                                name="price_type"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Pricing Model *</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value={PriceType.PER_SESSION} />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        Per Session - Students can buy individual sessions
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value={PriceType.FULL_COURSE} />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        Full Course - Students must buy the entire course
                                                    </FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {priceType === PriceType.PER_SESSION && (
                                <FormField
                                    control={form.control}
                                    name="price_per_session"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price per Session (USD) *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    placeholder="10.00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Minimum price is $1.00 per session
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {priceType === PriceType.FULL_COURSE && (
                                <FormField
                                    control={form.control}
                                    name="price_full_course"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Course Price (USD) *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    placeholder="80.00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Minimum price is $1.00 for the full course
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Creating...' : 'Create Course'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
