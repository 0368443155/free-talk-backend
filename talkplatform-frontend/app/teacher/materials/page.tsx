"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, BarChart3 } from 'lucide-react';
import { marketplaceApi } from '@/api/marketplace';
import { useToast } from '@/components/ui/use-toast';

export default function TeacherMaterialsPage() {
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchMaterials();
    }, []);

    // Refresh materials when page is focused (e.g., after redirect from upload)
    useEffect(() => {
        const handleFocus = () => {
            fetchMaterials();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const fetchMaterials = async () => {
        try {
            const response = await marketplaceApi.getTeacherMaterials({ page: 1, limit: 10 });
            setMaterials(response.items);
        } catch (error) {
            console.error('Failed to fetch materials:', error);
            // toast({
            //   title: "Error",
            //   description: "Failed to load materials",
            //   variant: "destructive",
            // });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Materials</h1>
                    <p className="text-gray-500 mt-1">Manage your learning resources</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/teacher/materials/analytics">
                        <Button variant="outline" className="gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </Button>
                    </Link>
                    <Link href="/teacher/materials/upload">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Upload New Material
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Sales</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No materials found. Upload your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            materials.map((material) => (
                                <TableRow key={material.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            {material.thumbnail_url && (
                                                <img
                                                    src={material.thumbnail_url}
                                                    alt=""
                                                    className="w-10 h-10 rounded object-cover"
                                                />
                                            )}
                                            <span>{material.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize">{material.material_type}</TableCell>
                                    <TableCell>{material.price_credits} Credits</TableCell>
                                    <TableCell>{material.total_sales}</TableCell>
                                    <TableCell>
                                        <Badge variant={material.is_published ? 'default' : 'secondary'}>
                                            {material.is_published ? 'Published' : 'Draft'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
