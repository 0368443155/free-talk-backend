import { MaterialCard } from '@/components/marketplace/material-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

// Mock data
const MOCK_MATERIALS = [
    {
        id: '1',
        title: 'Complete IELTS Writing Task 2 Guide',
        description: 'A comprehensive guide to mastering IELTS Writing Task 2 with templates and examples.',
        material_type: 'pdf' as const,
        price_credits: 50,
        original_price_credits: 100,
        rating: 4.8,
        total_reviews: 124,
        total_sales: 1500,
        teacher: {
            id: 't1',
            username: 'Sarah Teacher',
        },
    },
    {
        id: '2',
        title: 'Business English Vocabulary Masterclass',
        description: 'Learn essential business vocabulary for meetings, emails, and negotiations.',
        material_type: 'video' as const,
        price_credits: 120,
        rating: 4.9,
        total_reviews: 89,
        total_sales: 850,
        teacher: {
            id: 't2',
            username: 'John Business',
        },
    },
    {
        id: '3',
        title: 'Daily Conversation Starters',
        description: '100+ conversation starters to help you speak confidently in any situation.',
        material_type: 'ebook' as const,
        price_credits: 0,
        rating: 4.5,
        total_reviews: 230,
        total_sales: 5000,
        teacher: {
            id: 't3',
            username: 'Emma Talk',
        },
    },
];

export default function MarketplacePage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Learning Marketplace</h1>
                    <p className="text-gray-500 mt-1">Discover premium resources from top teachers</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Search materials..." className="pl-9" />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
                {['All', 'Grammar', 'Vocabulary', 'Pronunciation', 'Business', 'Test Prep', 'Kids'].map((cat) => (
                    <Button
                        key={cat}
                        variant={cat === 'All' ? 'default' : 'outline'}
                        className="rounded-full whitespace-nowrap"
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {MOCK_MATERIALS.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                ))}
            </div>
        </div>
    );
}
