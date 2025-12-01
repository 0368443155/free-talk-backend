# 💳 Hệ Thống Thanh Toán VNPay - Implementation Guide

**Version**: 1.0  
**Status**: 📋 Ready to Implement  
**Priority**: High  
**Estimated Time**: 3-4 days

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [VNPay Registration](#vnpay-registration)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Testing Guide](#testing-guide)
7. [Production Deployment](#production-deployment)
8. [Future: Stripe Integration](#future-stripe-integration)

---

## 📋 Overview

### Purpose

Cho phép students mua credits bằng VNPay (ngân hàng Việt Nam) để:
- Enroll courses
- Purchase sessions
- Mua materials

### Payment Flow

```
Student → Chọn gói credits → VNPay Payment Page
    ↓
Thanh toán qua ngân hàng
    ↓
VNPay IPN (Instant Payment Notification)
    ↓
Backend verify & add credits
    ↓
Student nhận credits → Có thể mua courses
```

### Credit Packages

| Package | Credits | Price (VND) | Bonus |
|---------|---------|-------------|-------|
| Starter | 10 | 100,000 | - |
| Basic | 50 | 450,000 | +10% |
| Pro | 100 | 850,000 | +15% |
| Premium | 200 | 1,600,000 | +20% |

**Note**: 1 credit = $1 USD = ~25,000 VND (tỷ giá có thể thay đổi)

---

## 🔐 VNPay Registration

### Step 1: Đăng Ký Tài Khoản VNPay

1. **Truy cập**: https://sandbox.vnpayment.vn/
2. **Đăng ký tài khoản demo** (miễn phí)
3. **Nhận thông tin**:
   - `TMN_CODE` (Terminal Code)
   - `HASH_SECRET` (Secret Key)
   - `URL` (Payment Gateway URL)

### Step 2: Lấy Thông Tin API

**Sandbox (Test)**:
```
VNP_TMN_CODE=DEMO (hoặc mã của bạn)
VNP_HASH_SECRET=DEMOSECRETKEY (hoặc secret của bạn)
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:3001/payment/vnpay/return
VNP_IPN_URL=http://localhost:3000/api/payment/vnpay/ipn
```

**Production**:
```
VNP_TMN_CODE=YOUR_PRODUCTION_CODE
VNP_HASH_SECRET=YOUR_PRODUCTION_SECRET
VNP_URL=https://vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=https://yourdomain.com/payment/vnpay/return
VNP_IPN_URL=https://yourdomain.com/api/payment/vnpay/ipn
```

### Step 3: Cấu Hình .env

**File**: `talkplatform-backend/.env`

```env
# VNPay Configuration
VNPAY_TMN_CODE=DEMO
VNPAY_HASH_SECRET=DEMOSECRETKEY
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/payment/vnpay/return
VNPAY_IPN_URL=http://localhost:3000/api/payment/vnpay/ipn

# Currency
VNPAY_CURRENCY_CODE=VND
VNPAY_LOCALE=vn

# Exchange Rate (1 USD = VND)
USD_TO_VND_RATE=25000
```

---

## 🗄️ Database Schema

### 1. Credit Packages Table

```sql
CREATE TABLE credit_packages (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  credits INT NOT NULL,
  price_vnd DECIMAL(10,2) NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  bonus_percentage DECIMAL(5,2) DEFAULT 0,
  total_credits INT NOT NULL, -- credits + bonus
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active),
  INDEX idx_order (display_order)
);

-- Insert default packages
INSERT INTO credit_packages (id, name, credits, price_vnd, price_usd, bonus_percentage, total_credits, display_order) VALUES
(UUID(), 'Starter', 10, 100000, 4, 0, 10, 1),
(UUID(), 'Basic', 50, 450000, 18, 10, 55, 2),
(UUID(), 'Pro', 100, 850000, 34, 15, 115, 3),
(UUID(), 'Premium', 200, 1600000, 64, 20, 240, 4);
```

### 2. Payment Transactions Table

```sql
CREATE TABLE payment_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  package_id VARCHAR(36),
  
  -- Payment Info
  payment_method VARCHAR(50) NOT NULL, -- vnpay, stripe
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL, -- VND, USD
  credits_amount INT NOT NULL,
  
  -- VNPay Specific
  vnpay_txn_ref VARCHAR(100),
  vnpay_transaction_no VARCHAR(100),
  vnpay_bank_code VARCHAR(50),
  vnpay_card_type VARCHAR(50),
  vnpay_order_info TEXT,
  vnpay_response_code VARCHAR(10),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
  payment_status VARCHAR(50), -- VNPay status
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Metadata
  metadata JSON,
  
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_vnpay_txn (vnpay_txn_ref),
  INDEX idx_created (created_at)
);
```

### 3. Update Credit Transactions Table

```sql
-- Add payment_transaction_id reference
ALTER TABLE credit_transactions
ADD COLUMN payment_transaction_id VARCHAR(36) NULL AFTER reference_id,
ADD INDEX idx_payment_transaction (payment_transaction_id);
```

---

## 🔧 Backend Implementation

### Step 1: Install Dependencies

```bash
cd talkplatform-backend
npm install crypto querystring moment
```

### Step 2: Create Entities

#### 2.1 CreditPackage Entity

**File**: `src/features/payments/entities/credit-package.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('credit_packages')
@Index(['is_active'])
@Index(['display_order'])
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  credits: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_vnd: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_usd: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  bonus_percentage: number;

  @Column({ type: 'int' })
  total_credits: number; // credits + bonus

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### 2.2 PaymentTransaction Entity

**File**: `src/features/payments/entities/payment-transaction.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { CreditPackage } from './credit-package.entity';

export enum PaymentMethod {
  VNPAY = 'vnpay',
  STRIPE = 'stripe',
  ADMIN = 'admin',
}

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payment_transactions')
@Index(['user_id'])
@Index(['status'])
@Index(['vnpay_txn_ref'])
@Index(['created_at'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  package_id: string;

  // Payment Info
  @Column({
    type: 'varchar',
    length: 50,
    enum: PaymentMethod,
  })
  payment_method: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'int' })
  credits_amount: number;

  // VNPay Specific
  @Column({ type: 'varchar', length: 100, nullable: true })
  vnpay_txn_ref: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vnpay_transaction_no: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vnpay_bank_code: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vnpay_card_type: string;

  @Column({ type: 'text', nullable: true })
  vnpay_order_info: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  vnpay_response_code: string;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status: PaymentTransactionStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_status: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  // Metadata
  @Column({ type: 'json', nullable: true })
  metadata: any;

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => CreditPackage, { eager: false })
  @JoinColumn({ name: 'package_id' })
  package: CreditPackage;
}
```

### Step 3: Create VNPay Service

**File**: `src/features/payments/vnpay.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import * as moment from 'moment';

@Injectable()
export class VNPayService {
  private readonly logger = new Logger(VNPayService.name);
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly url: string;
  private readonly returnUrl: string;
  private readonly ipnUrl: string;

  constructor(private configService: ConfigService) {
    this.tmnCode = this.configService.get('VNPAY_TMN_CODE');
    this.hashSecret = this.configService.get('VNPAY_HASH_SECRET');
    this.url = this.configService.get('VNPAY_URL');
    this.returnUrl = this.configService.get('VNPAY_RETURN_URL');
    this.ipnUrl = this.configService.get('VNPAY_IPN_URL');
  }

  /**
   * Create payment URL
   */
  createPaymentUrl(params: {
    amount: number;
    orderInfo: string;
    txnRef: string;
    ipAddr: string;
    bankCode?: string;
  }): string {
    const createDate = moment().format('YYYYMMDDHHmmss');
    const expireDate = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');

    let vnpParams: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.txnRef,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: params.amount * 100, // VNPay requires amount * 100
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (params.bankCode) {
      vnpParams.vnp_BankCode = params.bankCode;
    }

    // Sort params
    vnpParams = this.sortObject(vnpParams);

    // Create signature
    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnpParams.vnp_SecureHash = signed;

    // Create payment URL
    const paymentUrl = this.url + '?' + querystring.stringify(vnpParams, { encode: false });

    this.logger.log(`Payment URL created for txnRef: ${params.txnRef}`);
    return paymentUrl;
  }

  /**
   * Verify return URL
   */
  verifyReturnUrl(vnpParams: any): {
    isValid: boolean;
    responseCode: string;
    message: string;
  } {
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const responseCode = vnpParams.vnp_ResponseCode;

    let message = '';
    if (responseCode === '00') {
      message = 'Giao dịch thành công';
    } else {
      message = this.getResponseMessage(responseCode);
    }

    return { isValid, responseCode, message };
  }

  /**
   * Verify IPN (Instant Payment Notification)
   */
  verifyIPN(vnpParams: any): {
    isValid: boolean;
    responseCode: string;
    txnRef: string;
    amount: number;
    transactionNo: string;
  } {
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return {
      isValid: secureHash === signed,
      responseCode: vnpParams.vnp_ResponseCode,
      txnRef: vnpParams.vnp_TxnRef,
      amount: parseInt(vnpParams.vnp_Amount) / 100,
      transactionNo: vnpParams.vnp_TransactionNo,
    };
  }

  /**
   * Sort object by key
   */
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  /**
   * Get response message
   */
  private getResponseMessage(code: string): string {
    const messages: { [key: string]: string } = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác',
    };
    return messages[code] || 'Lỗi không xác định';
  }
}
```

### Step 4: Create Payment Service

**File**: `src/features/payments/payment.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreditPackage } from './entities/credit-package.entity';
import {
  PaymentTransaction,
  PaymentMethod,
  PaymentTransactionStatus,
} from './entities/payment-transaction.entity';
import { User } from '../../users/user.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { VNPayService } from './vnpay.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(CreditPackage)
    private packageRepository: Repository<CreditPackage>,
    @InjectRepository(PaymentTransaction)
    private paymentRepository: Repository<PaymentTransaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectDataSource()
    private dataSource: DataSource,
    private vnpayService: VNPayService,
    private configService: ConfigService,
  ) {}

  /**
   * Get all active credit packages
   */
  async getPackages(): Promise<CreditPackage[]> {
    return this.packageRepository.find({
      where: { is_active: true },
      order: { display_order: 'ASC' },
    });
  }

  /**
   * Create VNPay payment
   */
  async createVNPayPayment(
    userId: string,
    packageId: string,
    ipAddr: string,
    bankCode?: string,
  ): Promise<{ paymentUrl: string; txnRef: string }> {
    // Get package
    const package_ = await this.packageRepository.findOne({
      where: { id: packageId, is_active: true },
    });

    if (!package_) {
      throw new NotFoundException('Package not found');
    }

    // Get user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create transaction reference
    const txnRef = `CREDIT_${Date.now()}_${userId.substring(0, 8)}`;

    // Create payment transaction
    const payment = this.paymentRepository.create({
      user_id: userId,
      package_id: packageId,
      payment_method: PaymentMethod.VNPAY,
      amount: package_.price_vnd,
      currency: 'VND',
      credits_amount: package_.total_credits,
      vnpay_txn_ref: txnRef,
      vnpay_order_info: `Mua ${package_.total_credits} credits - ${package_.name}`,
      status: PaymentTransactionStatus.PENDING,
      metadata: {
        package_name: package_.name,
        credits: package_.credits,
        bonus: package_.total_credits - package_.credits,
      },
    });

    await this.paymentRepository.save(payment);

    // Create VNPay payment URL
    const paymentUrl = this.vnpayService.createPaymentUrl({
      amount: package_.price_vnd,
      orderInfo: payment.vnpay_order_info,
      txnRef: txnRef,
      ipAddr: ipAddr,
      bankCode: bankCode,
    });

    this.logger.log(`VNPay payment created: ${txnRef} for user ${userId}`);

    return { paymentUrl, txnRef };
  }

  /**
   * Handle VNPay return (user redirected back)
   */
  async handleVNPayReturn(vnpParams: any): Promise<{
    success: boolean;
    message: string;
    credits?: number;
  }> {
    const verification = this.vnpayService.verifyReturnUrl(vnpParams);

    if (!verification.isValid) {
      return {
        success: false,
        message: 'Chữ ký không hợp lệ',
      };
    }

    const txnRef = vnpParams.vnp_TxnRef;
    const payment = await this.paymentRepository.findOne({
      where: { vnpay_txn_ref: txnRef },
      relations: ['package'],
    });

    if (!payment) {
      return {
        success: false,
        message: 'Không tìm thấy giao dịch',
      };
    }

    if (verification.responseCode === '00') {
      return {
        success: true,
        message: verification.message,
        credits: payment.credits_amount,
      };
    } else {
      return {
        success: false,
        message: verification.message,
      };
    }
  }

  /**
   * Handle VNPay IPN (Instant Payment Notification)
   */
  async handleVNPayIPN(vnpParams: any): Promise<{
    RspCode: string;
    Message: string;
  }> {
    const verification = this.vnpayService.verifyIPN(vnpParams);

    if (!verification.isValid) {
      return {
        RspCode: '97',
        Message: 'Invalid signature',
      };
    }

    const payment = await this.paymentRepository.findOne({
      where: { vnpay_txn_ref: verification.txnRef },
      relations: ['package', 'user'],
    });

    if (!payment) {
      return {
        RspCode: '01',
        Message: 'Order not found',
      };
    }

    if (payment.status === PaymentTransactionStatus.COMPLETED) {
      return {
        RspCode: '02',
        Message: 'Order already confirmed',
      };
    }

    if (verification.responseCode === '00') {
      // Payment successful - add credits
      await this.dataSource.transaction(async (manager) => {
        // Update payment
        payment.status = PaymentTransactionStatus.COMPLETED;
        payment.payment_status = 'success';
        payment.vnpay_transaction_no = verification.transactionNo;
        payment.vnpay_response_code = verification.responseCode;
        payment.vnpay_bank_code = vnpParams.vnp_BankCode;
        payment.vnpay_card_type = vnpParams.vnp_CardType;
        payment.paid_at = new Date();
        payment.completed_at = new Date();
        await manager.save(PaymentTransaction, payment);

        // Add credits to user
        const user = await manager.findOne(User, { where: { id: payment.user_id } });
        const oldBalance = user.credit_balance || 0;
        const newBalance = oldBalance + payment.credits_amount;

        await manager.update(User, payment.user_id, {
          credit_balance: newBalance,
        });

        // Create transaction record
        await manager.save(Transaction, {
          user_id: payment.user_id,
          type: TransactionType.DEPOSIT,
          amount: payment.credits_amount,
          balance_before: oldBalance,
          balance_after: newBalance,
          status: TransactionStatus.COMPLETED,
          reference_type: 'payment_transaction',
          reference_id: payment.id,
          description: `Nạp ${payment.credits_amount} credits qua VNPay`,
          metadata: {
            payment_method: 'vnpay',
            package_id: payment.package_id,
            package_name: payment.package?.name,
            vnpay_txn_ref: payment.vnpay_txn_ref,
            vnpay_transaction_no: payment.vnpay_transaction_no,
          },
          completed_at: new Date(),
        });

        this.logger.log(
          `Credits added: ${payment.credits_amount} for user ${payment.user_id}`,
        );
      });

      return {
        RspCode: '00',
        Message: 'Confirm Success',
      };
    } else {
      // Payment failed
      payment.status = PaymentTransactionStatus.FAILED;
      payment.payment_status = 'failed';
      payment.vnpay_response_code = verification.responseCode;
      await this.paymentRepository.save(payment);

      return {
        RspCode: '00',
        Message: 'Confirm Success',
      };
    }
  }

  /**
   * Get user payment history
   */
  async getPaymentHistory(userId: string): Promise<PaymentTransaction[]> {
    return this.paymentRepository.find({
      where: { user_id: userId },
      relations: ['package'],
      order: { created_at: 'DESC' },
    });
  }
}
```

---

## 📝 Continue in Part 2...

**This is Part 1 of the VNPay documentation.**

Part 2 will include:
- Controllers implementation
- Frontend integration
- Testing guide
- Production deployment
- Stripe integration preparation

Would you like me to continue with Part 2?
