# 04. Referral Dashboard UI (Detailed)

## 1. API Implementation

### 1.1. Affiliate Stats DTO (`src/features/affiliate/dto/affiliate-stats.dto.ts`)

```typescript
export class AffiliateStatsDto {
    total_referrals: number;
    total_earnings: number;
    this_month_earnings: number;
    recent_referrals: {
        id: string;
        name: string;
        avatar: string;
        joined_at: Date;
    }[];
}
```

### 1.2. Controller Methods (`src/features/affiliate/affiliate.controller.ts`)

```typescript
@Get('dashboard')
async getDashboardStats(@CurrentUser() user: User): Promise<AffiliateStatsDto> {
    const stats = await this.affiliateService.getStats(user.id);
    return stats;
}

@Get('earnings-history')
async getEarningsHistory(
    @CurrentUser() user: User,
    @Query('period') period: 'week' | 'month' | 'year' = 'month'
) {
    return this.affiliateService.getEarningsHistory(user.id, period);
}
```

## 2. Frontend Implementation (Next.js + Tailwind)

### 2.1. Page Structure (`app/dashboard/affiliate/page.tsx`)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Users, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AffiliateDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetch('/api/v1/affiliate/dashboard')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            });
    }, []);

    const copyLink = () => {
        navigator.clipboard.writeText(stats?.link);
        toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Affiliate Program</h1>
            </div>

            {/* Link Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                <CardHeader>
                    <CardTitle className="text-blue-900">Your Referral Link</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <code className="flex-1 p-3 bg-white rounded border font-mono text-sm">
                            {stats?.link}
                        </code>
                        <button 
                            onClick={copyLink}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Copy size={16} /> Copy Link
                        </button>
                    </div>
                    <p className="text-sm text-blue-600 mt-2">
                        Share this link to earn <strong>90%</strong> revenue from students you refer!
                    </p>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="Total Referrals" 
                    value={stats.total_referrals} 
                    icon={<Users className="h-4 w-4 text-muted-foreground" />} 
                />
                <StatCard 
                    title="Total Earnings" 
                    value={`${stats.total_earnings} Credits`} 
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} 
                />
                <StatCard 
                    title="This Month" 
                    value={`+${stats.this_month_earnings}`} 
                    icon={<TrendingUp className="h-4 w-4 text-green-500" />} 
                />
            </div>

            {/* Detailed Views */}
            <Tabs defaultValue="referrals" className="w-full">
                <TabsList>
                    <TabsTrigger value="referrals">My Referrals</TabsTrigger>
                    <TabsTrigger value="earnings">Earnings History</TabsTrigger>
                </TabsList>
                <TabsContent value="referrals">
                    <ReferralList referrals={stats.recent_referrals} />
                </TabsContent>
                <TabsContent value="earnings">
                    <EarningsChart />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatCard({ title, value, icon }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}
```

### 2.2. Referral List Component (`components/affiliate/ReferralList.tsx`)

```tsx
export function ReferralList({ referrals }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {referrals.map((user) => (
                        <div key={user.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                            <div className="flex items-center gap-4">
                                <img src={user.avatar || '/default-avatar.png'} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-gray-500">Joined {new Date(user.joined_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                        </div>
                    ))}
                    {referrals.length === 0 && <p className="text-center text-gray-500">No referrals yet.</p>}
                </div>
            </CardContent>
        </Card>
    );
}
```

## 3. Integration Steps

1.  **Backend**: Implement `AffiliateService.getStats` to aggregate data from `users` (count referrals) and `credit_transactions` (sum earnings).
2.  **Frontend**: Create the page at `app/dashboard/affiliate/page.tsx`.
3.  **Navigation**: Add link "Affiliate Program" to the User Sidebar/Dropdown.
