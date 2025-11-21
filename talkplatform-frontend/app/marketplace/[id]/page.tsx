import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
    Star,
    Download,
    Eye,
    Share2,
    Flag,
    FileText,
    CheckCircle,
    Clock,
    Calendar
} from 'lucide-react';

// Mock data
const MOCK_MATERIAL = {
    id: '1',
    title: 'Complete IELTS Writing Task 2 Guide',
    description: `Master IELTS Writing Task 2 with this comprehensive guide. 
  
  What you'll learn:
  - Structure of a high-scoring essay
  - Vocabulary for different topics
  - Grammar structures to impress examiners
  - 50+ sample essays with analysis
  
  This guide is suitable for students aiming for Band 7.0+.`,
    material_type: 'pdf',
    price_credits: 50,
    original_price_credits: 100,
    rating: 4.8,
    total_reviews: 124,
    total_sales: 1500,
    created_at: '2023-10-15',
    updated_at: '2023-11-20',
    language: 'English',
    level: 'Advanced',
    file_size: '15MB',
    page_count: 120,
    teacher: {
        id: 't1',
        username: 'Sarah Teacher',
        avatar_url: 'https://github.com/shadcn.png',
        bio: 'IELTS Examiner with 10 years of experience.',
        rating: 4.9,
        total_students: 5000
    },
    reviews: [
        {
            id: 'r1',
            user: { username: 'Student A', avatar_url: '' },
            rating: 5,
            comment: 'This guide is amazing! I got Band 7.5 thanks to it.',
            created_at: '2023-11-01'
        },
        {
            id: 'r2',
            user: { username: 'Student B', avatar_url: '' },
            rating: 4,
            comment: 'Very detailed and helpful.',
            created_at: '2023-10-28'
        }
    ]
};

export default function MaterialDetailPage({ params }: { params: { id: string } }) {
    // In a real app, fetch data based on params.id
    const material = MOCK_MATERIAL;

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
                            <Badge variant="outline">{material.level}</Badge>
                            <Badge variant="outline">{material.language}</Badge>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">{material.title}</h1>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-medium text-gray-900">{material.rating}</span>
                                <span className="text-gray-500">({material.total_reviews} reviews)</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Download className="w-4 h-4" />
                                <span>{material.total_sales} sales</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>Updated {material.updated_at}</span>
                            </div>
                        </div>
                    </div>

                    {/* Preview / Thumbnail */}
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border">
                        <FileText className="w-20 h-20 text-gray-300" />
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="description">
                        <TabsList>
                            <TabsTrigger value="description">Description</TabsTrigger>
                            <TabsTrigger value="reviews">Reviews ({material.total_reviews})</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="description" className="mt-6">
                            <div className="prose max-w-none whitespace-pre-line">
                                {material.description}
                            </div>
                        </TabsContent>
                        <TabsContent value="reviews" className="mt-6">
                            <div className="space-y-6">
                                {material.reviews.map((review) => (
                                    <div key={review.id} className="flex gap-4 border-b pb-6 last:border-0">
                                        <Avatar>
                                            <AvatarImage src={review.user.avatar_url} />
                                            <AvatarFallback>{review.user.username[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">{review.user.username}</span>
                                                <span className="text-sm text-gray-500">{review.created_at}</span>
                                            </div>
                                            <div className="flex text-yellow-500 mb-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-gray-600">{review.comment}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                        <TabsContent value="preview" className="mt-6">
                            <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed">
                                <p className="text-gray-500">Preview not available for this material.</p>
                            </div>
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
                                    {material.price_credits} Credits
                                </span>
                                {material.original_price_credits && (
                                    <span className="text-lg text-gray-400 line-through mb-1">
                                        {material.original_price_credits}
                                    </span>
                                )}
                            </div>

                            <Button className="w-full text-lg py-6">
                                Buy Now
                            </Button>

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
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={material.teacher.avatar_url} />
                                    <AvatarFallback>{material.teacher.username[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold">{material.teacher.username}</h3>
                                    <div className="flex items-center gap-1 text-sm text-yellow-500">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span>{material.teacher.rating} Teacher Rating</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-4">
                                {material.teacher.bio}
                            </p>
                            <Button variant="outline" className="w-full">
                                View Profile
                            </Button>
                        </CardContent>
                    </Card>

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
