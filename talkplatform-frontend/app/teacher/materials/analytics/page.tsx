'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { analyticsApi, RevenueStats, MaterialSalesStats, RevenueTimeSeries } from '@/api/marketplace-analytics';
import { DollarSign, TrendingUp, ShoppingCart, Percent, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from '@/components/ui/use-toast';

export default function MaterialAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<RevenueStats | null>(null);
    const [topMaterials, setTopMaterials] = useState<MaterialSalesStats[]>([]);
    const [chartData, setChartData] = useState<RevenueTimeSeries[]>([]);
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });
    const { toast } = useToast();

    useEffect(() => {
        loadAnalytics();
    }, [period, dateRange]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const [statsData, topData, chartDataResult] = await Promise.all([
                analyticsApi.getRevenueStats({
                    start_date: dateRange.start,
                    end_date: dateRange.end,
                }),
                analyticsApi.getTopMaterials(10),
                analyticsApi.getRevenueChart({
                    period,
                    start_date: dateRange.start,
                    end_date: dateRange.end,
                }),
            ]);

            setStats(statsData);
            setTopMaterials(topData);
            setChartData(chartDataResult);
        } catch (error: any) {
            console.error('Failed to load analytics:', error);
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to load analytics data',
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

    if (!stats) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="text-center">
                    <p className="text-lg text-muted-foreground">Failed to load analytics data</p>
                    <Button onClick={loadAnalytics} className="mt-4">
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
                <p className="text-muted-foreground mt-1">Track your material sales and earnings</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_revenue.toFixed(0)} Credits</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            From {stats.total_sales} sales
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Your Earnings</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.teacher_earnings.toFixed(0)} Credits
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">70% of revenue</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platform Fee</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.platform_fee.toFixed(0)} Credits
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">30% of revenue</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Sale Price</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.avg_sale_price.toFixed(0)} Credits
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Per material</p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Chart */}
            <Card className="mb-8">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Revenue Over Time</CardTitle>
                        <div className="flex gap-4 items-center">
                            <div className="flex gap-2 items-center">
                                <label className="text-sm text-muted-foreground">Period:</label>
                                <Select value={period} onValueChange={(v: 'day' | 'week' | 'month') => setPeriod(v)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Daily</SelectItem>
                                        <SelectItem value="week">Weekly</SelectItem>
                                        <SelectItem value="month">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 items-center">
                                <label className="text-sm text-muted-foreground">Date Range:</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="px-3 py-2 border rounded-md text-sm"
                                />
                                <span className="text-sm text-muted-foreground">to</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number) => [`${value.toFixed(0)} Credits`, 'Revenue']}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Revenue (Credits)"
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No data available for selected period
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Materials */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Materials</CardTitle>
                </CardHeader>
                <CardContent>
                    {topMaterials.length > 0 ? (
                        <div className="space-y-4">
                            {topMaterials.map((material, index) => (
                                <div
                                    key={material.material_id}
                                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-bold text-muted-foreground">
                                            #{index + 1}
                                        </div>
                                        {material.thumbnail_url ? (
                                            <img
                                                src={material.thumbnail_url}
                                                alt={material.title}
                                                className="w-12 h-12 rounded object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                                No Image
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium">{material.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {material.total_sales} sales
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">
                                            {material.teacher_earnings.toFixed(0)} Credits
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Total: {material.total_revenue.toFixed(0)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No materials sold yet
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

