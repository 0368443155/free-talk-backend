"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  getTeacherRevenueSummary,
  getTeacherTransactionHistory,
  getTeacherWithdrawalHistory,
  type RevenueSummary,
  type Transaction,
  type Withdrawal,
} from '@/api/revenue.rest';
import { useUser } from '@/store/user-store';
import Link from 'next/link';

export default function TeacherRevenuePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo } = useUser();

  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    if (!userInfo || userInfo.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [userInfo, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [revenueData, withdrawalsData] = await Promise.all([
        getTeacherRevenueSummary(),
        getTeacherWithdrawalHistory(),
      ]);
      setRevenue(revenueData);
      setWithdrawals(withdrawalsData);
      
      // Load transactions
      await loadTransactions();
    } catch (error: any) {
      console.error('Error loading revenue data:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load revenue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (limit = 10) => {
    try {
      setTransactionsLoading(true);
      const data = await getTeacherTransactionHistory(limit, 0);
      setTransactions(data.transactions);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'payment_release':
        return 'text-green-600 dark:text-green-400';
      case 'commission':
        return 'text-red-600 dark:text-red-400';
      case 'refund':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment_release':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'commission':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <ArrowDownRight className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getWithdrawalStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      processing: { variant: 'default', label: 'Processing' },
      completed: { variant: 'default', label: 'Completed' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your earnings and withdrawals</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/teacher/revenue/withdraw">
            <Button>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </Link>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      {revenue && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.total_earnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Before commissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(revenue.net_earnings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                After {formatCurrency(revenue.total_commissions)} commissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.available_balance)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready to withdraw
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue.pending_payments)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting release
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest payment activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {transaction.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(transaction.balance_after)}
                      </p>
                    </div>
                  </div>
                ))}
                <Link href="/teacher/revenue/transactions">
                  <Button variant="outline" className="w-full">
                    View All Transactions
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>Your withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No withdrawals yet
              </p>
            ) : (
              <div className="space-y-4">
                {withdrawals.slice(0, 5).map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                        {getWithdrawalStatusBadge(withdrawal.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(withdrawal.requested_at).toLocaleDateString()}
                      </p>
                      {withdrawal.admin_notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: {withdrawal.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {withdrawals.length > 5 && (
                  <Link href="/teacher/revenue/withdrawals">
                    <Button variant="outline" className="w-full">
                      View All Withdrawals
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

