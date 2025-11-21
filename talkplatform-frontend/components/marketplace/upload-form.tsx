"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { marketplaceApi } from '@/api/marketplace';
import { Loader2, Upload } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    material_type: z.enum(['pdf', 'video', 'slide', 'audio', 'document', 'course', 'ebook']),
    price_credits: z.string().transform((val) => parseInt(val, 10)),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'all']),
    language: z.string().min(2, 'Language is required'),
});

export function UploadMaterialForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
            material_type: 'pdf',
            price_credits: 0,
            level: 'all',
            language: 'English',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!file) {
            toast({
                title: "Error",
                description: "Please select a file to upload",
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        try {
            // 1. Upload file directly to backend
            const { fileUrl, fileSize } = await marketplaceApi.uploadMaterialFile(file);

            // 2. Create material record
            await marketplaceApi.createMaterial({
                ...values,
                file_url: fileUrl,
                file_size: fileSize,
            });

            toast({
                title: "Success",
                description: "Material uploaded successfully",
            });

            router.push('/teacher/materials');
        } catch (error) {
            console.error('Upload failed:', error);
            toast({
                title: "Error",
                description: "Failed to upload material",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Complete IELTS Guide" {...field} />
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
                                    placeholder="Describe what students will learn..."
                                    className="min-h-[150px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="material_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="pdf">PDF</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="slide">Slide</SelectItem>
                                        <SelectItem value="audio">Audio</SelectItem>
                                        <SelectItem value="ebook">E-book</SelectItem>
                                        <SelectItem value="course">Course</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="all">All Levels</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="price_credits"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (Credits)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormDescription>Set 0 for free materials</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Language</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <FormLabel>Upload File</FormLabel>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            {file ? (
                                <span className="font-medium text-blue-600">{file.name}</span>
                            ) : (
                                <span className="text-gray-500">Click or drag file to upload</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {uploading ? 'Uploading...' : 'Upload Material'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
