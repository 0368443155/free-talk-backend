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
    price_credits: z.union([
        z.string().transform((val) => parseInt(val, 10)),
        z.number()
    ]).pipe(z.number().int().min(0)),
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
            const { fileUrl, fileSize, previewUrl, thumbnailUrl, pageCount } = await marketplaceApi.uploadMaterialFile(file);

            // 2. Create material record
            const materialData: any = {
                title: values.title,
                description: values.description,
                material_type: values.material_type,
                level: values.level,
                language: values.language,
                file_url: fileUrl,
                file_size: typeof fileSize === 'number' ? fileSize : parseInt(String(fileSize || 0), 10),
                price_credits: typeof values.price_credits === 'number' 
                    ? values.price_credits 
                    : parseInt(String(values.price_credits || 0), 10),
            };

            // Add preview and thumbnail URLs if available (from PDF processing)
            if (previewUrl) {
                materialData.preview_url = previewUrl;
            }
            if (thumbnailUrl) {
                materialData.thumbnail_url = thumbnailUrl;
            }
            if (pageCount) {
                materialData.page_count = pageCount;
            }

            console.log('Creating material with data:', JSON.stringify(materialData, null, 2));
            const createdMaterial = await marketplaceApi.createMaterial(materialData);

            console.log('Material created successfully:', createdMaterial);

            toast({
                title: "Success",
                description: "Material uploaded successfully",
            });

            // Use window.location to force full page reload and data refresh
            window.location.href = '/teacher/materials';
        } catch (error: any) {
            console.error('Upload failed:', error);
            console.error('Full error response:', JSON.stringify(error?.response, null, 2));
            console.error('Error data:', JSON.stringify(error?.response?.data, null, 2));
            
            // Extract validation messages
            let errorMessage = 'Failed to upload material';
            if (error?.response?.data?.message) {
                if (Array.isArray(error.response.data.message)) {
                    // Format validation errors: "field should be..." or just the message
                    errorMessage = error.response.data.message
                        .map((msg: any) => {
                            if (typeof msg === 'string') return msg;
                            if (msg.property) {
                                const constraints = Object.values(msg.constraints || {}).join(', ');
                                return `${msg.property}: ${constraints}`;
                            }
                            return JSON.stringify(msg);
                        })
                        .join('\n');
                } else {
                    errorMessage = error.response.data.message;
                }
            } else if (error?.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            console.error('Formatted error message:', errorMessage);
            
            toast({
                title: "Error",
                description: errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage,
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
