'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download, ShoppingCart, Loader2 } from 'lucide-react';
import { marketplaceApi } from '@/api/marketplace';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

export default function PreviewPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [material, setMaterial] = useState<any>(null);
    const materialId = params.id as string;

    useEffect(() => {
        loadPreview();
    }, [materialId]);

    const loadPreview = async () => {
        try {
            setLoading(true);
            // Load material info first
            const materialData = await marketplaceApi.getMaterialById(materialId);
            setMaterial(materialData);

            // Get preview signed URL
            if (materialData.preview_url) {
                // Use signed preview URL if available
                const previewData = await marketplaceApi.getPreviewUrl(materialId);
                setPreviewUrl(previewData.preview_url);
            } else {
                // Fallback to direct preview_url
                setPreviewUrl(materialData.preview_url);
            }
        } catch (error: any) {
            console.error('Failed to load preview:', error);
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to load preview',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!previewUrl || !material) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <p className="text-muted-foreground mb-4">Preview not available for this material</p>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <div className="flex gap-2">
                    <Link href={`/marketplace/${materialId}`}>
                        <Button variant="outline">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            View Details
                        </Button>
                    </Link>
                </div>
            </div>

            <Alert className="mb-6 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800">
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    <strong>Preview Mode:</strong> This is a preview of the first 3 pages only. 
                    Purchase the material to access the full content.
                </AlertDescription>
            </Alert>

            {/* Material Info */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <h1 className="text-2xl font-bold mb-2">{material.title}</h1>
                    <p className="text-muted-foreground mb-4">{material.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By {material.teacher?.username}</span>
                        {material.page_count && <span>{material.page_count} pages</span>}
                        <span className="font-semibold text-green-600">
                            {material.price_credits} Credits
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* PDF Viewer */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <iframe
                        src={previewUrl}
                        className="w-full h-[800px] border-0"
                        title="Material Preview"
                        style={{ minHeight: '800px' }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

