'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Users, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getAffiliateDashboardApi, getReferralsApi, getEarningsHistoryApi, type AffiliateStats, type Referral, type EarningsHistoryItem } from '@/api/affiliate.rest';

export default function AffiliateDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<EarningsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('referrals');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load dashboard stats
    loadDashboardStats();
  }, [router]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await getAffiliateDashboardApi();
      setStats(data);
      // Also load initial referrals
      if (activeTab === 'referrals') {
        await loadReferrals();
      }
    } catch (error: any) {
      console.error('Failed to load affiliate dashboard:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to load affiliate dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReferrals = async (page: number = 1) => {
    try {
      setReferralsLoading(true);
      const data = await getReferralsApi(page, 20);
      setReferrals(data.referrals);
    } catch (error: any) {
      console.error('Failed to load referrals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referrals',
        variant: 'destructive',
      });
    } finally {
      setReferralsLoading(false);
    }
  };

  const loadEarningsHistory = async (period: 'week' | 'month' | 'year' = 'month') => {
    try {
      setEarningsLoading(true);
      const data = await getEarningsHistoryApi(period);
      setEarningsHistory(data);
    } catch (error: any) {
      console.error('Failed to load earnings history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load earnings history',
        variant: 'destructive',
      });
    } finally {
      setEarningsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'referrals' && referrals.length === 0) {
      loadReferrals();
    } else if (value === 'earnings' && earningsHistory.length === 0) {
      loadEarningsHistory();
    }
  };

  const copyLink = () => {
    if (!stats?.referral_link) return;
    navigator.clipboard.writeText(stats.referral_link);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard.',
    });
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Failed to load affiliate dashboard</p>
          <Button onClick={loadDashboardStats} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Program</h1>
          <p className="text-muted-foreground mt-1">Track your referrals and earnings</p>
        </div>
      </div>

      {/* Link Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Your Referral Link</CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Share this link to earn 90% revenue from students you refer!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded border font-mono text-sm break-all">
              {stats.referral_link || 'Loading...'}
            </code>
            <Button onClick={copyLink} className="bg-blue-600 hover:bg-blue-700">
              <Copy className="h-4 w-4 mr-2" /> Copy Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Referrals"
          value={stats.total_referrals.toString()}
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="referrals">My Referrals</TabsTrigger>
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
        </TabsList>
        <TabsContent value="referrals" className="space-y-4">
          <ReferralList referrals={referrals} loading={referralsLoading} />
        </TabsContent>
        <TabsContent value="earnings" className="space-y-4">
          <EarningsHistoryList history={earningsHistory} loading={earningsLoading} onPeriodChange={loadEarningsHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
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

function ReferralList({ referrals, loading }: { referrals: Referral[]; loading: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Referrals</CardTitle>
        <CardDescription>People who joined using your referral link</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {referrals.length > 0 ? (
            referrals.map((user) => (
              <div key={user.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar_url || '/default-avatar.png'}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(user.joined_at).toLocaleDateString()}
                    </p>
                    {user.total_spent > 0 && (
                      <p className="text-sm text-muted-foreground">Spent: {user.total_spent} credits</p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    user.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No referrals yet. Share your link to start earning!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EarningsHistoryList({
  history,
  loading,
  onPeriodChange,
}: {
  history: EarningsHistoryItem[];
  loading: boolean;
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
}) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    onPeriodChange(period);
  }, [period, onPeriodChange]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Earnings History</CardTitle>
            <CardDescription>Track your affiliate earnings over time</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
            >
              Week
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
            >
              Month
            </Button>
            <Button
              variant={period === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('year')}
            >
              Year
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.length > 0 ? (
            history.map((item) => (
              <div key={item.date} className="border-b pb-4 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">{new Date(item.date).toLocaleDateString()}</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">+{item.earnings} Credits</p>
                </div>
                {item.transactions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.transactions.slice(0, 3).map((tx) => (
                      <p key={tx.id} className="text-sm text-muted-foreground">
                        • {tx.description}: +{tx.amount} credits
                      </p>
                    ))}
                    {item.transactions.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {item.transactions.length - 3} more transaction(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No earnings yet. Start referring to earn!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

