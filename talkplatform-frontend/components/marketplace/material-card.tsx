import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Download, Eye, FileText, Video, Music, Book } from 'lucide-react';

interface Material {
    id: string;
    title: string;
    description: string;
    material_type: 'pdf' | 'video' | 'slide' | 'audio' | 'document' | 'course' | 'ebook';
    thumbnail_url?: string;
    price_credits: number;
    original_price_credits?: number;
    rating: number;
    total_reviews: number;
    total_sales: number;
    teacher: {
        id: string;
        username: string;
        avatar_url?: string;
    };
}

interface MaterialCardProps {
    material: Material;
}

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

export function MaterialCard({ material }: MaterialCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
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
                <div className="flex justify-between items-start gap-2">
                    <Link href={`/marketplace/${material.id}`} className="hover:underline">
                        <h3 className="font-semibold line-clamp-2 text-lg leading-tight">
                            {material.title}
                        </h3>
                    </Link>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span>By {material.teacher.username}</span>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 flex-1">
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {material.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{material.rating.toFixed(1)}</span>
                        <span className="text-gray-400">({material.total_reviews})</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{material.total_sales}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex flex-col">
                    {material.original_price_credits && material.original_price_credits > material.price_credits && (
                        <span className="text-xs text-gray-400 line-through">
                            {material.original_price_credits} Credits
                        </span>
                    )}
                    <span className="font-bold text-blue-600 text-lg">
                        {material.price_credits === 0 ? 'FREE' : `${material.price_credits} Credits`}
                    </span>
                </div>
                <Link href={`/marketplace/${material.id}`}>
                    <Button size="sm">View Details</Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
