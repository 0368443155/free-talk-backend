"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
    Star,
    Download,
    Share2,
    Flag,
    FileText,
    CheckCircle,
    Clock,
    Loader2,
    ShoppingCart,
    AlertCircle,
    Play,
} from 'lucide-react';
import { marketplaceApi, Material } from '@/api/marketplace';
import { getWalletBalanceApi } from '@/api/wallet.rest';
import { useUser } from '@/store/user-store';

export default function MaterialDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { userInfo: user, isAuthenticated } = useUser();

    const materialId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [material, setMaterial] = useState<Material | null>(null);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [balance, setBalance] = useState<number>(0);
    const [balanceLoading, setBalanceLoading] = useState(true);

    useEffect(() => {
        if (materialId) {
            loadMaterial();
            if (isAuthenticated) {
                loadBalance();
                checkPurchased();
            }
        }
    }, [materialId, isAuthenticated]);

    const loadMaterial = async () => {
        try {
            setLoading(true);
            const data = await marketplaceApi.getMaterialById(materialId);
            setMaterial(data);
            if (data.has_purchased) {
                setHasPurchased(true);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load material",
                variant: "destructive",
            });
            router.push('/marketplace');
        } finally {
            setLoading(false);
        }
    };

    const loadBalance = async () => {
        try {
            setBalanceLoading(true);
            const data = await getWalletBalanceApi();
            setBalance(data.balance);
        } catch (error) {
            console.error('Failed to load balance');
        } finally {
            setBalanceLoading(false);
        }
    };

    const checkPurchased = async () => {
        try {
            const data = await marketplaceApi.checkPurchased(materialId);
            setHasPurchased(data.has_purchased);
        } catch (error) {
            // Ignore error, user might not be authenticated
        }
    };

    const handlePurchase = async () => {
        if (!isAuthenticated) {
            toast({
                title: "Login Required",
                description: "Please login to purchase materials",
                variant: "destructive",
            });
            router.push('/login');
            return;
        }

        if (!material) return;

        if (balance < material.price_credits) {
            toast({
                title: "Insufficient Credits",
                description: `You need ${material.price_credits} credits but only have ${balance}`,
                variant: "destructive",
            });
            router.push('/credits/purchase');
            return;
        }

        try {
            setPurchasing(true);
            await marketplaceApi.purchaseMaterial(materialId);
            
            toast({
                title: "Success",
                description: "Material purchased successfully!",
            });
            
            setHasPurchased(true);
            await loadBalance();
            await loadMaterial();
        } catch (error: any) {
            toast({
                title: "Purchase Failed",
                description: error.response?.data?.message || "Failed to purchase material",
                variant: "destructive",
            });
        } finally {
            setPurchasing(false);
        }
    };

    const handleDownload = async () => {
        if (!hasPurchased) {
            toast({
                title: "Purchase Required",
                description: "Please purchase this material first",
                variant: "destructive",
            });
            return;
        }

        try {
            const data = await marketplaceApi.getDownloadUrl(materialId);
            // Navigate to signed URL (will trigger file download)
            window.location.href = data.download_url;
        } catch (error: any) {
            toast({
                title: "Download Failed",
                description: error.response?.data?.message || "Failed to get download URL",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            </div>
        );
    }

    if (!material) {
        return null;
    }

    const canPurchase = isAuthenticated && !hasPurchased && material.price_credits > 0;
    const insufficientCredits = isAuthenticated && balance < material.price_credits;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="secondary" className="capitalize">
                                {material.material_type}
                            </Badge>
                            {material.level && (
                                <Badge variant="outline">{material.level}</Badge>
                            )}
                            {material.language && (
                                <Badge variant="outline">{material.language}</Badge>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">{material.title}</h1>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-medium text-gray-900">{material.rating.toFixed(1)}</span>
                                <span className="text-gray-500">({material.total_reviews} reviews)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Download className="w-4 h-4" />
                                <span>{material.total_sales} sales</span>
                            </div>
                            {material.view_count !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{material.view_count} views</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview / Thumbnail */}
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border">
                        {material.thumbnail_url ? (
                            <img
                                src={material.thumbnail_url}
                                alt={material.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <FileText className="w-20 h-20 text-gray-300" />
                        )}
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="description">
                        <TabsList>
                            <TabsTrigger value="description">Description</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="description" className="mt-6">
                            <div className="prose max-w-none whitespace-pre-line">
                                {material.description}
                            </div>
                        </TabsContent>
                        <TabsContent value="preview" className="mt-6">
                            {material.preview_url ? (
                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                    {material.material_type === 'video' ? (
                                        <video
                                            src={material.preview_url}
                                            controls
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <iframe
                                            src={material.preview_url}
                                            className="w-full h-full"
                                            title="Preview"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed">
                                    <p className="text-gray-500">Preview not available for this material.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    {/* Purchase Card */}
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-blue-600">
                                    {material.price_credits === 0 ? 'FREE' : `${material.price_credits} Credits`}
                                </span>
                                {material.original_price_credits && material.original_price_credits > material.price_credits && (
                                    <span className="text-lg text-gray-400 line-through mb-1">
                                        {material.original_price_credits}
                                    </span>
                                )}
                            </div>

                            {hasPurchased ? (
                                <>
                                    <Button
                                        className="w-full text-lg py-6"
                                        onClick={handleDownload}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                    <Alert>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            You own this material. Download anytime!
                                        </AlertDescription>
                                    </Alert>
                                </>
                            ) : (
                                <>
                                    {isAuthenticated && (
                                        <div className="text-sm text-gray-600">
                                            Your balance: <strong>{balanceLoading ? '...' : `${balance} credits`}</strong>
                                        </div>
                                    )}
                                    {insufficientCredits && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Insufficient credits. <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/credits/purchase')}>Buy more</Button>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <Button
                                        className="w-full text-lg py-6"
                                        onClick={handlePurchase}
                                        disabled={purchasing || insufficientCredits || !canPurchase}
                                    >
                                        {purchasing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                {material.price_credits === 0 ? 'Get Free' : 'Buy Now'}
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}

                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Lifetime access</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Downloadable resources</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span>Free updates</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Teacher Profile */}
                    {material.teacher && (
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={material.teacher.avatar_url} />
                                        <AvatarFallback>{material.teacher.username[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{material.teacher.username}</h3>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push(`/teachers/${material.teacher.id}/book`)}
                                >
                                    View Profile
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 gap-2">
                            <Share2 className="w-4 h-4" />
                            Share
                        </Button>
                        <Button variant="ghost" className="flex-1 gap-2 text-gray-500">
                            <Flag className="w-4 h-4" />
                            Report
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
