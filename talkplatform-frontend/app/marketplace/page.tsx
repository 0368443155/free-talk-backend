"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MaterialCard } from '@/components/marketplace/material-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Loader2 } from 'lucide-react';
import { marketplaceApi, Material, FilterMaterialDto } from '@/api/marketplace';
import { useToast } from '@/components/ui/use-toast';

const MATERIAL_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'pdf', label: 'PDF' },
    { value: 'video', label: 'Video' },
    { value: 'slide', label: 'Slides' },
    { value: 'audio', label: 'Audio' },
    { value: 'ebook', label: 'E-book' },
    { value: 'course', label: 'Course' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
];

export default function MarketplacePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(12);

    // Filters
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [type, setType] = useState(searchParams.get('type') || 'all');
    const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadMaterials();
    }, [page, type, sort, search]);

    const loadMaterials = async () => {
        try {
            setLoading(true);
            const filters: FilterMaterialDto = {
                page,
                limit,
                sort,
            };

            if (search) {
                filters.search = search;
            }

            if (type && type !== 'all') {
                filters.type = type;
            }

            const response = await marketplaceApi.getAllMaterials(filters);
            setMaterials(response.items || []);
            setTotal(response.meta?.total || 0);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to load materials",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadMaterials();
    };

    const handleFilterChange = (key: string, value: string) => {
        setPage(1);
        if (key === 'type') setType(value);
        if (key === 'sort') setSort(value);
    };

    const totalPages = Math.ceil(total / limit);

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
                        <Input
                            placeholder="Search materials..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </Button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Type</label>
                        <Select value={type} onValueChange={(value) => handleFilterChange('type', value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MATERIAL_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Sort By</label>
                        <Select value={sort} onValueChange={(value) => handleFilterChange('sort', value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleSearch} className="w-full">
                            Apply Filters
                        </Button>
                    </div>
                </div>
            )}

            {/* Results Count */}
            <div className="mb-6">
                <p className="text-sm text-gray-600">
                    Showing {materials.length} of {total} materials
                </p>
            </div>

            {/* Materials Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : materials.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No materials found</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {materials.map((material) => (
                            <MaterialCard key={material.id} material={material} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            <Button
                                variant="outline"
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={page === pageNum ? 'default' : 'outline'}
                                            onClick={() => setPage(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
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
