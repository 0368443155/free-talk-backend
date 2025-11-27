"use client";

import { useUser } from '@/store/user-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CreditBalance() {
    const { userInfo } = useUser();
    const router = useRouter();

    if (!userInfo) return null;

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Credit Balance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-primary">
                            ${userInfo.credit_balance || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Available credits
                        </p>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                        <DollarSign className="w-3 h-3 mr-1" />
                        1 Credit = $1
                    </Badge>
                </div>
                <button
                    onClick={() => router.push('/credits')}
                    className="text-xs text-primary hover:underline mt-2"
                >
                    Add credits →
                </button>
            </CardContent>
        </Card>
    );
}

