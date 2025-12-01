# 💳 VNPay Payment Integration - Part 2

**Controllers, Frontend & Testing**

---

## 🎮 Backend Controllers

### Step 5: Create Payment Controller

**File**: `src/features/payments/payment.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { Response } from 'express';

class CreateVNPayPaymentDto {
  packageId: string;
  bankCode?: string;
}

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('packages')
  @ApiOperation({ summary: 'Get all credit packages' })
  async getPackages() {
    return this.paymentService.getPackages();
  }

  @Post('vnpay/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create VNPay payment' })
  async createVNPayPayment(
    @Req() req: any,
    @Body() dto: CreateVNPayPaymentDto,
    @Ip() ipAddr: string,
  ) {
    const userId = req.user.id;
    return this.paymentService.createVNPayPayment(
      userId,
      dto.packageId,
      ipAddr,
      dto.bankCode,
    );
  }

  @Get('vnpay/return')
  @ApiOperation({ summary: 'VNPay return URL (user redirected here)' })
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVNPayReturn(query);
    
    // Redirect to frontend with result
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/payment/result?success=${result.success}&message=${encodeURIComponent(result.message)}&credits=${result.credits || 0}`;
    
    return res.redirect(redirectUrl);
  }

  @Post('vnpay/ipn')
  @ApiOperation({ summary: 'VNPay IPN (Instant Payment Notification)' })
  async vnpayIPN(@Query() query: any) {
    return this.paymentService.handleVNPayIPN(query);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  async getPaymentHistory(@Req() req: any) {
    return this.paymentService.getPaymentHistory(req.user.id);
  }
}
```

### Step 6: Create Payments Module

**File**: `src/features/payments/payments.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { VNPayService } from './vnpay.service';
import { CreditPackage } from './entities/credit-package.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Transaction } from './entities/transaction.entity';
import { User } from '../../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditPackage,
      PaymentTransaction,
      Transaction,
      User,
    ]),
    ConfigModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, VNPayService],
  exports: [PaymentService, VNPayService],
})
export class PaymentsModule {}
```

### Step 7: Update App Module

**File**: `src/app.module.ts`

```typescript
import { PaymentsModule } from './features/payments/payments.module';

@Module({
  imports: [
    // ... existing imports ...
    PaymentsModule,
  ],
})
export class AppModule {}
```

---

## 🎨 Frontend Implementation

### Step 1: Create API Client

**File**: `talkplatform-frontend/src/api/payment.ts`

```typescript
import api from './config';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_vnd: number;
  price_usd: number;
  bonus_percentage: number;
  total_credits: number;
  is_active: boolean;
  display_order: number;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  package_id: string;
  payment_method: string;
  amount: number;
  currency: string;
  credits_amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
  package?: CreditPackage;
}

export const paymentApi = {
  // Get all credit packages
  getPackages: async (): Promise<CreditPackage[]> => {
    const response = await api.get('/payment/packages');
    return response.data;
  },

  // Create VNPay payment
  createVNPayPayment: async (packageId: string, bankCode?: string): Promise<{
    paymentUrl: string;
    txnRef: string;
  }> => {
    const response = await api.post('/payment/vnpay/create', {
      packageId,
      bankCode,
    });
    return response.data;
  },

  // Get payment history
  getPaymentHistory: async (): Promise<PaymentTransaction[]> => {
    const response = await api.get('/payment/history');
    return response.data;
  },
};
```

### Step 2: Create Buy Credits Page

**File**: `talkplatform-frontend/src/app/student/buy-credits/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { paymentApi, CreditPackage } from '@/api/payment';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function BuyCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await paymentApi.getPackages();
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPackage = async (packageId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setProcessing(true);
    setSelectedPackage(packageId);

    try {
      const { paymentUrl } = await paymentApi.createVNPayPayment(packageId);
      
      // Redirect to VNPay
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Failed to create payment:', error);
      alert('Không thể tạo thanh toán. Vui lòng thử lại.');
      setProcessing(false);
      setSelectedPackage(null);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Mua Credits
          </h1>
          <p className="text-xl text-gray-600">
            Chọn gói credits phù hợp để bắt đầu học
          </p>
          {user && (
            <div className="mt-4 inline-block bg-blue-50 px-6 py-3 rounded-lg">
              <span className="text-gray-600">Số dư hiện tại: </span>
              <span className="text-2xl font-bold text-blue-600">
                {user.credit_balance || 0} credits
              </span>
            </div>
          )}
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 transition-all ${
                pkg.name === 'Pro'
                  ? 'border-blue-500 transform scale-105'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Popular Badge */}
              {pkg.name === 'Pro' && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-semibold">
                  PHỔ BIẾN NHẤT
                </div>
              )}

              <div className="p-6">
                {/* Package Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {pkg.name}
                </h3>

                {/* Credits */}
                <div className="mb-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {pkg.total_credits}
                  </div>
                  <div className="text-sm text-gray-600">credits</div>
                  {pkg.bonus_percentage > 0 && (
                    <div className="mt-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                      +{pkg.bonus_percentage}% BONUS
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatVND(pkg.price_vnd)}
                  </div>
                  <div className="text-sm text-gray-500">
                    ≈ ${pkg.price_usd}
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => handleBuyPackage(pkg.id)}
                  disabled={processing && selectedPackage === pkg.id}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    pkg.name === 'Pro'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  } ${
                    processing && selectedPackage === pkg.id
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {processing && selectedPackage === pkg.id ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : (
                    'Mua ngay'
                  )}
                </button>

                {/* Features */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 mr-2 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {pkg.credits} credits gốc
                  </div>
                  {pkg.bonus_percentage > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      +{pkg.total_credits - pkg.credits} credits bonus
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 mr-2 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Không giới hạn thời gian
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="mt-12 bg-gray-50 rounded-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Phương thức thanh toán
          </h3>
          <div className="flex items-center space-x-4">
            <img
              src="/images/vnpay-logo.png"
              alt="VNPay"
              className="h-12"
            />
            <span className="text-gray-600">
              Thanh toán an toàn qua VNPay - Hỗ trợ tất cả ngân hàng Việt Nam
            </span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Câu hỏi thường gặp
          </h3>
          <div className="space-y-4">
            <details className="bg-white rounded-lg p-4 shadow">
              <summary className="font-semibold cursor-pointer">
                Credits là gì?
              </summary>
              <p className="mt-2 text-gray-600">
                Credits là đơn vị tiền tệ trong hệ thống. 1 credit = $1 USD. Bạn
                sử dụng credits để mua khóa học và các dịch vụ khác.
              </p>
            </details>
            <details className="bg-white rounded-lg p-4 shadow">
              <summary className="font-semibold cursor-pointer">
                Credits có hết hạn không?
              </summary>
              <p className="mt-2 text-gray-600">
                Không, credits của bạn không có thời hạn sử dụng.
              </p>
            </details>
            <details className="bg-white rounded-lg p-4 shadow">
              <summary className="font-semibold cursor-pointer">
                Tôi có thể hoàn tiền không?
              </summary>
              <p className="mt-2 text-gray-600">
                Credits đã mua không thể hoàn tiền. Tuy nhiên, nếu bạn hủy khóa
                học trước khi bắt đầu, credits sẽ được hoàn lại vào tài khoản.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Create Payment Result Page

**File**: `talkplatform-frontend/src/app/payment/result/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  const success = searchParams.get('success') === 'true';
  const message = searchParams.get('message') || '';
  const credits = parseInt(searchParams.get('credits') || '0');

  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/student/my-learning');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {success ? (
            <>
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thanh toán thành công!
              </h1>

              <p className="text-gray-600 mb-6">{message}</p>

              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <div className="text-sm text-gray-600 mb-2">
                  Bạn đã nhận được
                </div>
                <div className="text-4xl font-bold text-blue-600">
                  {credits} credits
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Tự động chuyển hướng sau {countdown} giây...
              </p>

              <div className="space-y-3">
                <Link
                  href="/courses"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Khám phá khóa học
                </Link>
                <Link
                  href="/student/my-learning"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Xem khóa học của tôi
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Error Icon */}
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thanh toán thất bại
              </h1>

              <p className="text-gray-600 mb-8">{message}</p>

              <div className="space-y-3">
                <Link
                  href="/student/buy-credits"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Thử lại
                </Link>
                <Link
                  href="/"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Về trang chủ
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Guide

### Test 1: Get Credit Packages

```bash
curl http://localhost:3000/api/payment/packages
```

**Expected Response**:
```json
[
  {
    "id": "...",
    "name": "Starter",
    "credits": 10,
    "price_vnd": 100000,
    "price_usd": 4,
    "bonus_percentage": 0,
    "total_credits": 10
  },
  ...
]
```

### Test 2: Create VNPay Payment

```bash
curl -X POST http://localhost:3000/api/payment/vnpay/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PACKAGE_ID"
  }'
```

**Expected Response**:
```json
{
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "txnRef": "CREDIT_1733054400000_12345678"
}
```

### Test 3: VNPay Sandbox Testing

1. **Open payment URL** in browser
2. **Select bank**: NCB (Test bank)
3. **Card info**:
   - Card Number: `9704198526191432198`
   - Card Holder: `NGUYEN VAN A`
   - Issue Date: `07/15`
   - OTP: `123456`

4. **Complete payment**
5. **Verify redirect** to `/payment/result?success=true`
6. **Check credits** added to user account

---

## 📝 Continue in Part 3...

Part 3 will include:
- Production deployment
- Webhook security
- Error handling
- Stripe integration preparation
- Complete API documentation

Would you like me to create Part 3?
