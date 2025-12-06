"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Search, Download, FileText, Video, Music, Book, Loader2, Star } from 'lucide-react';
import { marketplaceApi, MaterialPurchase, Material } from '@/api/marketplace';
import { useUser } from '@/store/user-store';

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'video': return <Video className="w-4 h-4" />;
        case 'audio': return <Music className="w-4 h-4" />;
        case 'pdf':
        case 'document': return <FileText className="w-4 h-4" />;
        case 'ebook':
        case 'course': return <Book className="w-4 h-4" />;
        default: return <FileText className="w-4 h-4" />;
    }
};

export default function MyPurchasesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { isAuthenticated } = useUser();

    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 12;

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        loadPurchases();
    }, [page, isAuthenticated]);

    const loadPurchases = async () => {
        try {
            setLoading(true);
            const response = await marketplaceApi.getPurchasedMaterials(page, limit);
            setMaterials(response.items || []);
            setTotal(response.meta?.total || 0);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load purchased materials",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (material: Material) => {
        try {
            const data = await marketplaceApi.getDownloadUrl(material.id);
            // Navigate to signed URL (will trigger file download)
            window.location.href = data.download_url;
            toast({
                title: "Success",
                description: "Download started",
            });
        } catch (error: any) {
            toast({
                title: "Download Failed",
                description: error.response?.data?.message || "Failed to download",
                variant: "destructive",
            });
        }
    };

    const filteredMaterials = materials.filter((material) =>
        material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
                    <p className="text-gray-500 mt-1">Access all your purchased materials</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search your purchases..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : filteredMaterials.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 text-lg mb-2">
                            {searchQuery ? 'No materials found' : 'No purchases yet'}
                        </p>
                        <p className="text-gray-400 text-sm mb-6">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Start exploring the marketplace to find great learning materials'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => router.push('/marketplace')}>
                                Browse Marketplace
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="mb-4">
                        <p className="text-sm text-gray-600">
                            {filteredMaterials.length} of {total} purchased materials
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMaterials.map((material) => (
                            <Card key={material.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="relative aspect-video bg-gray-100">
                                    {material.thumbnail_url ? (
                                        <img
                                            src={material.thumbnail_url}
                                            alt={material.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            {getTypeIcon(material.material_type)}
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            {getTypeIcon(material.material_type)}
                                            <span className="capitalize">{material.material_type}</span>
                                        </Badge>
                                    </div>
                                </div>

                                <CardHeader className="p-4 pb-2">
                                    <h3 className="font-semibold line-clamp-2 text-lg leading-tight">
                                        {material.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        By {material.teacher?.username}
                                    </p>
                                </CardHeader>

                                <CardContent className="p-4 pt-0 space-y-3">
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {material.description}
                                    </p>

                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <div className="flex items-center gap-1 text-yellow-500 text-sm">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="font-medium">{material.rating.toFixed(1)}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownload(material)}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {Math.ceil(total / limit) > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            <Button
                                variant="outline"
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                    Page {page} of {Math.ceil(total / limit)}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setPage(Math.min(Math.ceil(total / limit), page + 1))}
                                disabled={page >= Math.ceil(total / limit)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

