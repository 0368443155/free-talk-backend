"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building2,
  CreditCard,
  User,
} from 'lucide-react';
import {
  requestWithdrawal,
  type CreateWithdrawalDto,
} from '@/api/withdrawals.rest';
import {
  getTeacherRevenueSummary,
  type RevenueSummary,
} from '@/api/revenue.rest';
import { useUser } from '@/store/user-store';
import Link from 'next/link';

export default function WithdrawalRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo } = useUser();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [branch, setBranch] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [notes, setNotes] = useState('');

  const MIN_WITHDRAWAL = 10;

  useEffect(() => {
    if (!userInfo || userInfo.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }
    loadRevenue();
  }, [userInfo, router]);

  const loadRevenue = async () => {
    try {
      setLoading(true);
      const data = await getTeacherRevenueSummary();
      setRevenue(data);
    } catch (error: any) {
      console.error('Error loading revenue:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue data",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    
    // Validation
    if (!amountNum || amountNum < MIN_WITHDRAWAL) {
      toast({
        title: "Invalid Amount",
        description: `Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL)}`,
        variant: "destructive",
      });
      return;
    }

    if (revenue && amountNum > revenue.available_balance) {
      toast({
        title: "Insufficient Balance",
        description: `Available balance: ${formatCurrency(revenue.available_balance)}`,
        variant: "destructive",
      });
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required bank account fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const dto: CreateWithdrawalDto = {
        amount: amountNum,
        bank_account_info: {
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          branch: branch || undefined,
          swift_code: swiftCode || undefined,
        },
        notes: notes || undefined,
      };

      await requestWithdrawal(dto);
      
      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      });

      router.push('/teacher/revenue');
    } catch (error: any) {
      console.error('Error requesting withdrawal:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit withdrawal request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teacher/revenue">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Request Withdrawal</h1>
          <p className="text-muted-foreground mt-1">Withdraw your earnings to your bank account</p>
        </div>
      </div>

      {/* Available Balance Card */}
      {revenue && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {formatCurrency(revenue.available_balance)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-600 dark:text-green-400 opacity-50" />
            </div>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Minimum withdrawal amount is {formatCurrency(MIN_WITHDRAWAL)}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal Form */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Details</CardTitle>
          <CardDescription>Enter the amount and bank account information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={MIN_WITHDRAWAL}
                  max={revenue?.available_balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
              {revenue && (
                <p className="text-xs text-muted-foreground">
                  Maximum: {formatCurrency(revenue.available_balance)}
                </p>
              )}
            </div>

            {/* Bank Account Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Bank Account Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Chase Bank"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="accountName">Account Holder Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="accountName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="John Doe"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Branch (Optional)</Label>
                  <Input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Main Branch"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                  <Input
                    id="swiftCode"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value)}
                    placeholder="CHASUS33"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link href="/teacher/revenue" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={submitting || !revenue || parseFloat(amount) > (revenue?.available_balance || 0)}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

