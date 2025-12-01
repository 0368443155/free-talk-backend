"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  DollarSign,
} from 'lucide-react';
import {
  getMyWithdrawals,
  type Withdrawal,
} from '@/api/withdrawals.rest';
import { useUser } from '@/store/user-store';
import Link from 'next/link';

export default function WithdrawalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo } = useUser();

  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    if (!userInfo || userInfo.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }
    loadWithdrawals();
  }, [userInfo, router]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const data = await getMyWithdrawals();
      setWithdrawals(data);
    } catch (error: any) {
      console.error('Error loading withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to load withdrawals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      processing: { variant: 'default', label: 'Processing', icon: Loader2 },
      completed: { variant: 'default', label: 'Completed', icon: CheckCircle2 },
      rejected: { variant: 'destructive', label: 'Rejected', icon: XCircle },
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
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
      <div className="flex items-center gap-4">
        <Link href="/teacher/revenue">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Withdrawal History</h1>
          <p className="text-muted-foreground mt-1">View all your withdrawal requests</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/teacher/revenue/withdraw">
            <Button>
              <DollarSign className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </Link>
          <Button onClick={loadWithdrawals} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="space-y-4">
        {withdrawals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No withdrawals yet</p>
              <Link href="/teacher/revenue/withdraw">
                <Button>Request Your First Withdrawal</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold">
                          {formatCurrency(withdrawal.amount)}
                        </span>
                      </div>
                      {getStatusBadge(withdrawal.status)}
                    </div>

                    {/* Bank Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Bank</p>
                          <p className="text-sm font-medium">{withdrawal.bank_account_info.bank_name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="text-sm font-medium">****{withdrawal.bank_account_info.account_number.slice(-4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Name</p>
                        <p className="text-sm font-medium">{withdrawal.bank_account_info.account_name}</p>
                      </div>
                      {withdrawal.bank_account_info.branch && (
                        <div>
                          <p className="text-xs text-muted-foreground">Branch</p>
                          <p className="text-sm font-medium">{withdrawal.bank_account_info.branch}</p>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Requested:</span>{' '}
                        {new Date(withdrawal.requested_at).toLocaleString()}
                      </div>
                      {withdrawal.processed_at && (
                        <div>
                          <span className="font-medium">Processed:</span>{' '}
                          {new Date(withdrawal.processed_at).toLocaleString()}
                        </div>
                      )}
                      {withdrawal.completed_at && (
                        <div>
                          <span className="font-medium">Completed:</span>{' '}
                          {new Date(withdrawal.completed_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {withdrawal.notes && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Your Notes:</p>
                        <p className="text-sm">{withdrawal.notes}</p>
                      </div>
                    )}

                    {withdrawal.admin_notes && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Admin Notes:</p>
                        <p className="text-sm">{withdrawal.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

