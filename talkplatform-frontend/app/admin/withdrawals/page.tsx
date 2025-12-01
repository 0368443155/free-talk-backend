"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  DollarSign,
  Building2,
  User,
} from 'lucide-react';
import {
  getAllWithdrawals,
  approveWithdrawal,
  completeWithdrawal,
  rejectWithdrawal,
  type Withdrawal,
} from '@/api/withdrawals.rest';
import { useUser } from '@/store/user-store';

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo } = useUser();

  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'complete' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!userInfo || userInfo.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    loadWithdrawals();
  }, [userInfo, router, filterStatus]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const data = await getAllWithdrawals(filterStatus || undefined);
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

  const handleAction = (withdrawal: Withdrawal, type: 'approve' | 'complete' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setAdminNotes('');
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedWithdrawal || !actionType) return;

    try {
      setProcessing(true);
      let result: Withdrawal;

      switch (actionType) {
        case 'approve':
          result = await approveWithdrawal(selectedWithdrawal.id, adminNotes || undefined);
          break;
        case 'complete':
          result = await completeWithdrawal(selectedWithdrawal.id, adminNotes || undefined);
          break;
        case 'reject':
          if (!adminNotes.trim()) {
            toast({
              title: "Error",
              description: "Admin notes are required for rejection",
              variant: "destructive",
            });
            return;
          }
          result = await rejectWithdrawal(selectedWithdrawal.id, adminNotes);
          break;
      }

      toast({
        title: "Success",
        description: `Withdrawal ${actionType}d successfully`,
      });

      setActionDialogOpen(false);
      setSelectedWithdrawal(null);
      setActionType(null);
      setAdminNotes('');
      await loadWithdrawals();
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${actionType} withdrawal`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
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
          <h1 className="text-3xl font-bold">Withdrawal Management</h1>
          <p className="text-muted-foreground mt-1">Manage teacher withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadWithdrawals} variant="outline" size="sm">
            <Loader2 className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filter by Status</Label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals List */}
      <div className="space-y-4">
        {withdrawals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No withdrawals found</p>
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
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Account Name</p>
                          <p className="text-sm font-medium">{withdrawal.bank_account_info.account_name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="text-sm font-medium">****{withdrawal.bank_account_info.account_number.slice(-4)}</p>
                      </div>
                      {withdrawal.bank_account_info.branch && (
                        <div>
                          <p className="text-xs text-muted-foreground">Branch</p>
                          <p className="text-sm font-medium">{withdrawal.bank_account_info.branch}</p>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex gap-6 text-sm text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground mb-1">Teacher Notes:</p>
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

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {withdrawal.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleAction(withdrawal, 'approve')}
                          size="sm"
                          className="w-full"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleAction(withdrawal, 'reject')}
                          size="sm"
                          variant="destructive"
                          className="w-full"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {withdrawal.status === 'processing' && (
                      <Button
                        onClick={() => handleAction(withdrawal, 'complete')}
                        size="sm"
                        className="w-full"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Withdrawal'}
              {actionType === 'complete' && 'Complete Withdrawal'}
              {actionType === 'reject' && 'Reject Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'This will deduct the amount from the teacher\'s balance.'}
              {actionType === 'complete' && 'Mark this withdrawal as completed after bank transfer.'}
              {actionType === 'reject' && 'Reject this withdrawal request. Admin notes are required.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedWithdrawal && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Amount: {formatCurrency(selectedWithdrawal.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Teacher: {selectedWithdrawal.teacher_id}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="adminNotes">
                Admin Notes {actionType === 'reject' && '*'}
              </Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this action..."
                rows={3}
                required={actionType === 'reject'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setAdminNotes('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmAction} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === 'approve' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {actionType === 'complete' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {actionType === 'reject' && <XCircle className="w-4 h-4 mr-2" />}
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

