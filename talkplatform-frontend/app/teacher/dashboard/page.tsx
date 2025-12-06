'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/store/user-store';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  DollarSign,
  Users,
  Calendar,
  BookOpen,
  TrendingUp,
  Wallet,
  Award,
  FileText,
  ArrowRight,
  Clock,
  Star,
} from 'lucide-react';
import {
  getTeacherRevenueSummary,
  type RevenueSummary,
} from '@/api/revenue.rest';
import { getAffiliateDashboardApi, type AffiliateStats } from '@/api/affiliate.rest';
import { getMyTeacherProfileApi } from '@/api/teachers.rest';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { userInfo } = useUser();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);

  useEffect(() => {
    if (!userInfo || userInfo.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }

    loadDashboardData();
  }, [userInfo, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [revenueData, affiliateData, profileData] = await Promise.allSettled([
        getTeacherRevenueSummary(),
        getAffiliateDashboardApi(),
        getMyTeacherProfileApi(),
      ]);

      if (revenueData.status === 'fulfilled') {
        setRevenue(revenueData.value);
      }

      if (affiliateData.status === 'fulfilled') {
        setAffiliateStats(affiliateData.value);
      }

      if (profileData.status === 'fulfilled') {
        setTeacherProfile(profileData.value);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {userInfo?.username}! Manage your teaching business here.
        </p>
      </div>

      {/* Verification Status */}
      {teacherProfile && (
        <Card className={teacherProfile.is_verified ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {teacherProfile.is_verified ? (
                  <>
                    <Award className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Verified Teacher</p>
                      <p className="text-sm text-green-700">Your profile is verified and active</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-900">Verification Pending</p>
                      <p className="text-sm text-yellow-700">Complete verification to access all features</p>
                    </div>
                  </>
                )}
              </div>
              {!teacherProfile.is_verified && (
                <Link href="/teacher/verification">
                  <Button variant="outline">Complete Verification</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={revenue ? `$${revenue.total_revenue.toFixed(2)}` : 'Loading...'}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="All time earnings"
        />
        <StatCard
          title="Available Balance"
          value={revenue ? `$${revenue.available_balance.toFixed(2)}` : 'Loading...'}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          description="Ready to withdraw"
        />
        <StatCard
          title="Total Referrals"
          value={affiliateStats ? affiliateStats.total_referrals.toString() : '0'}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Affiliate referrals"
        />
        <StatCard
          title="Affiliate Earnings"
          value={affiliateStats ? `${affiliateStats.total_earnings} Credits` : '0 Credits'}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          description="From referrals"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/teacher/revenue">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Revenue & Earnings
                </CardTitle>
                <CardDescription>View your earnings, transactions, and withdrawals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary">
                  View details <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/affiliate">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Affiliate Program
                </CardTitle>
                <CardDescription>Manage referrals and track affiliate earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary">
                  View details <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/availability">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Availability
                </CardTitle>
                <CardDescription>Set and manage your teaching schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary">
                  Manage schedule <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/materials">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                  Teaching Materials
                </CardTitle>
                <CardDescription>Upload and manage your teaching resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary">
                  Manage materials <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/verification">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Verification
                </CardTitle>
                <CardDescription>Check your verification status and requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary">
                  View status <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/teacher/revenue/withdraw">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  Withdraw Funds
                </CardTitle>
                <CardDescription>Request withdrawal of your earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-primary">
                  Withdraw now <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity Section */}
      {revenue && revenue.recent_transactions && revenue.recent_transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest earning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenue.recent_transactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{tx.description || 'Transaction'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={tx.amount > 0 ? 'default' : 'secondary'}>
                    {tx.amount > 0 ? '+' : ''}${tx.amount?.toFixed(2) || '0.00'}
                  </Badge>
                </div>
              ))}
              <Link href="/teacher/revenue/transactions">
                <Button variant="outline" className="w-full">
                  View All Transactions
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}
