# 💳 VNPay Payment Integration - Part 3

**Production, Security & Stripe Integration**

---

## 🚀 Production Deployment

### Step 1: Environment Configuration

**Production .env**:
```env
# VNPay Production
VNPAY_TMN_CODE=YOUR_PRODUCTION_TMN_CODE
VNPAY_HASH_SECRET=YOUR_PRODUCTION_HASH_SECRET
VNPAY_URL=https://vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://yourdomain.com/payment/vnpay/return
VNPAY_IPN_URL=https://yourdomain.com/api/payment/vnpay/ipn

# Currency
VNPAY_CURRENCY_CODE=VND
VNPAY_LOCALE=vn
USD_TO_VND_RATE=25000

# Frontend
FRONTEND_URL=https://yourdomain.com
```

### Step 2: Webhook Security

#### 2.1 IP Whitelist

**File**: `src/features/payments/guards/vnpay-ip.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VNPayIPGuard implements CanActivate {
  private readonly allowedIPs: string[];

  constructor(private configService: ConfigService) {
    // VNPay production IPs
    this.allowedIPs = [
      '113.160.92.202',
      '113.160.92.203',
      '113.160.92.204',
      '113.160.92.205',
      // Add more VNPay IPs
    ];

    // Allow localhost in development
    if (process.env.NODE_ENV === 'development') {
      this.allowedIPs.push('127.0.0.1', '::1', '::ffff:127.0.0.1');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIP = this.getClientIP(request);

    if (!this.allowedIPs.includes(clientIP)) {
      throw new ForbiddenException(`Access denied for IP: ${clientIP}`);
    }

    return true;
  }

  private getClientIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress
    );
  }
}
```

#### 2.2 Apply Guard to IPN

```typescript
// In payment.controller.ts
@Post('vnpay/ipn')
@UseGuards(VNPayIPGuard)
@ApiOperation({ summary: 'VNPay IPN (Instant Payment Notification)' })
async vnpayIPN(@Query() query: any) {
  return this.paymentService.handleVNPayIPN(query);
}
```

### Step 3: Logging & Monitoring

**File**: `src/features/payments/payment-logger.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Entity('payment_logs')
export class PaymentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  transaction_id: string;

  @Column()
  event_type: string; // create, ipn, return, error

  @Column({ type: 'json' })
  data: any;

  @Column({ nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}

@Injectable()
export class PaymentLoggerService {
  private readonly logger = new Logger(PaymentLoggerService.name);

  constructor(
    @InjectRepository(PaymentLog)
    private logRepository: Repository<PaymentLog>,
  ) {}

  async logEvent(
    transactionId: string,
    eventType: string,
    data: any,
    errorMessage?: string,
  ) {
    try {
      await this.logRepository.save({
        transaction_id: transactionId,
        event_type: eventType,
        data: data,
        error_message: errorMessage,
      });

      if (errorMessage) {
        this.logger.error(`Payment Error [${transactionId}]: ${errorMessage}`);
      } else {
        this.logger.log(`Payment Event [${transactionId}]: ${eventType}`);
      }
    } catch (error) {
      this.logger.error('Failed to log payment event:', error);
    }
  }
}
```

### Step 4: Error Handling

**File**: `src/features/payments/payment-error.handler.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PaymentLoggerService } from './payment-logger.service';

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public transactionId?: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

@Injectable()
export class PaymentErrorHandler {
  private readonly logger = new Logger(PaymentErrorHandler.name);

  constructor(private paymentLogger: PaymentLoggerService) {}

  async handleError(error: any, transactionId?: string) {
    const errorMessage = error.message || 'Unknown error';
    const errorCode = error.code || 'UNKNOWN_ERROR';

    // Log to database
    if (transactionId) {
      await this.paymentLogger.logEvent(
        transactionId,
        'error',
        {
          code: errorCode,
          message: errorMessage,
          stack: error.stack,
        },
        errorMessage,
      );
    }

    // Log to console
    this.logger.error(`Payment Error: ${errorMessage}`, error.stack);

    // Send alert (implement your alert system)
    if (this.isCriticalError(errorCode)) {
      await this.sendAlert(errorMessage, transactionId);
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: this.getUserFriendlyMessage(errorCode),
      },
    };
  }

  private isCriticalError(code: string): boolean {
    const criticalCodes = [
      'PAYMENT_VERIFICATION_FAILED',
      'CREDIT_UPDATE_FAILED',
      'DATABASE_ERROR',
    ];
    return criticalCodes.includes(code);
  }

  private getUserFriendlyMessage(code: string): string {
    const messages: { [key: string]: string } = {
      PAYMENT_VERIFICATION_FAILED: 'Không thể xác thực thanh toán',
      CREDIT_UPDATE_FAILED: 'Không thể cập nhật credits',
      DATABASE_ERROR: 'Lỗi hệ thống, vui lòng liên hệ support',
      PACKAGE_NOT_FOUND: 'Gói credits không tồn tại',
      INSUFFICIENT_BALANCE: 'Số dư không đủ',
      UNKNOWN_ERROR: 'Đã có lỗi xảy ra, vui lòng thử lại',
    };
    return messages[code] || messages.UNKNOWN_ERROR;
  }

  private async sendAlert(message: string, transactionId?: string) {
    // Implement your alert system (email, Slack, etc.)
    this.logger.error(`CRITICAL PAYMENT ERROR: ${message} [${transactionId}]`);
    // TODO: Send email/Slack notification
  }
}
```

---

## 🌍 Future: Stripe Integration

### Database Schema for Multi-Gateway

```sql
-- Update payment_transactions to support multiple gateways
ALTER TABLE payment_transactions
ADD COLUMN stripe_payment_intent_id VARCHAR(100) NULL,
ADD COLUMN stripe_customer_id VARCHAR(100) NULL,
ADD COLUMN stripe_charge_id VARCHAR(100) NULL,
ADD INDEX idx_stripe_payment_intent (stripe_payment_intent_id);
```

### Stripe Service Structure

**File**: `src/features/payments/stripe.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    metadata?: any;
  }): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amount * 100, // Stripe uses cents
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  /**
   * Create customer
   */
  async createCustomer(params: {
    email: string;
    name: string;
    metadata?: any;
  }): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
  }

  /**
   * Retrieve payment intent
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}
```

### Multi-Gateway Payment Service

**File**: `src/features/payments/multi-gateway-payment.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { VNPayService } from './vnpay.service';
import { StripeService } from './stripe.service';
import { PaymentMethod } from './entities/payment-transaction.entity';

@Injectable()
export class MultiGatewayPaymentService {
  constructor(
    private vnpayService: VNPayService,
    private stripeService: StripeService,
  ) {}

  /**
   * Create payment based on method
   */
  async createPayment(
    method: PaymentMethod,
    params: any,
  ): Promise<any> {
    switch (method) {
      case PaymentMethod.VNPAY:
        return this.createVNPayPayment(params);
      case PaymentMethod.STRIPE:
        return this.createStripePayment(params);
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }

  private async createVNPayPayment(params: any) {
    return this.vnpayService.createPaymentUrl(params);
  }

  private async createStripePayment(params: any) {
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: params.amount,
      currency: 'usd',
      metadata: params.metadata,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }
}
```

---

## 📊 Complete API Documentation

### Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payment/packages` | No | Get all credit packages |
| POST | `/payment/vnpay/create` | Yes | Create VNPay payment |
| GET | `/payment/vnpay/return` | No | VNPay return URL |
| POST | `/payment/vnpay/ipn` | No | VNPay IPN webhook |
| GET | `/payment/history` | Yes | Get payment history |
| POST | `/payment/stripe/create` | Yes | Create Stripe payment (future) |
| POST | `/payment/stripe/webhook` | No | Stripe webhook (future) |

### Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden (IP not whitelisted) |
| 404 | Not Found |
| 500 | Internal Server Error |

### VNPay Response Codes

| Code | Description |
|------|-------------|
| 00 | Success |
| 07 | Suspicious transaction |
| 09 | Not registered for internet banking |
| 10 | Wrong authentication (>3 times) |
| 11 | Payment timeout |
| 12 | Card/Account locked |
| 13 | Wrong OTP |
| 24 | User cancelled |
| 51 | Insufficient balance |
| 65 | Daily limit exceeded |
| 75 | Bank maintenance |
| 79 | Wrong password (>limit) |
| 99 | Other errors |

---

## 🔒 Security Checklist

### Production Security

- [ ] **Environment Variables**
  - [ ] Use production VNPay credentials
  - [ ] Secure hash secret
  - [ ] HTTPS URLs only

- [ ] **IP Whitelist**
  - [ ] Add VNPay production IPs
  - [ ] Remove localhost from whitelist
  - [ ] Test IP blocking

- [ ] **Webhook Security**
  - [ ] Verify signature on all webhooks
  - [ ] Log all webhook requests
  - [ ] Rate limiting on webhook endpoint

- [ ] **Database**
  - [ ] Encrypt sensitive data
  - [ ] Regular backups
  - [ ] Transaction logging

- [ ] **Monitoring**
  - [ ] Set up alerts for failed payments
  - [ ] Monitor payment success rate
  - [ ] Track suspicious activities

- [ ] **Error Handling**
  - [ ] Don't expose sensitive errors to users
  - [ ] Log all errors
  - [ ] Have rollback mechanism

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **Payment Success Rate**
   ```sql
   SELECT 
     COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate
   FROM payment_transactions
   WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);
   ```

2. **Average Transaction Value**
   ```sql
   SELECT 
     AVG(amount) as avg_amount,
     AVG(credits_amount) as avg_credits
   FROM payment_transactions
   WHERE status = 'completed'
   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
   ```

3. **Popular Packages**
   ```sql
   SELECT 
     cp.name,
     COUNT(*) as purchase_count,
     SUM(pt.amount) as total_revenue
   FROM payment_transactions pt
   JOIN credit_packages cp ON pt.package_id = cp.id
   WHERE pt.status = 'completed'
   GROUP BY cp.id
   ORDER BY purchase_count DESC;
   ```

4. **Failed Payments Analysis**
   ```sql
   SELECT 
     vnpay_response_code,
     COUNT(*) as count,
     COUNT(*) * 100.0 / (SELECT COUNT(*) FROM payment_transactions WHERE status = 'failed') as percentage
   FROM payment_transactions
   WHERE status = 'failed'
   GROUP BY vnpay_response_code
   ORDER BY count DESC;
   ```

---

## 🎓 Best Practices

### 1. Transaction Idempotency

Always check if transaction already processed:

```typescript
// Before processing payment
const existingPayment = await this.paymentRepository.findOne({
  where: { vnpay_txn_ref: txnRef },
});

if (existingPayment && existingPayment.status === 'completed') {
  return { RspCode: '02', Message: 'Already processed' };
}
```

### 2. Atomic Operations

Use database transactions for credit updates:

```typescript
await this.dataSource.transaction(async (manager) => {
  // Update payment
  await manager.save(PaymentTransaction, payment);
  
  // Update user credits
  await manager.increment(User, { id: userId }, 'credit_balance', amount);
  
  // Create transaction log
  await manager.save(Transaction, transaction);
});
```

### 3. Retry Mechanism

Implement retry for failed webhook processing:

```typescript
async processWebhookWithRetry(data: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.processWebhook(data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.delay(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### 4. Logging

Log all payment events:

```typescript
this.logger.log(`Payment created: ${txnRef}`);
this.logger.log(`Payment completed: ${txnRef}, amount: ${amount}`);
this.logger.error(`Payment failed: ${txnRef}, error: ${error.message}`);
```

---

## 🚀 Deployment Steps

### 1. Pre-Deployment

```bash
# 1. Update .env with production values
# 2. Run migrations
npm run migration:run

# 3. Build backend
npm run build

# 4. Build frontend
cd talkplatform-frontend
npm run build
```

### 2. Deploy Backend

```bash
# Using PM2
pm2 start dist/main.js --name talkplatform-api

# Or using Docker
docker build -t talkplatform-api .
docker run -p 3000:3000 talkplatform-api
```

### 3. Deploy Frontend

```bash
# Using Vercel
vercel --prod

# Or using Nginx
cp -r .next/standalone/* /var/www/talkplatform
systemctl restart nginx
```

### 4. Configure VNPay

1. Login to VNPay merchant portal
2. Update IPN URL: `https://yourdomain.com/api/payment/vnpay/ipn`
3. Update Return URL: `https://yourdomain.com/payment/vnpay/return`
4. Test with sandbox first
5. Switch to production

### 5. Test Production

```bash
# Test payment creation
curl https://yourdomain.com/api/payment/packages

# Monitor logs
pm2 logs talkplatform-api

# Check database
mysql -u root -p
USE talkplatform;
SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 10;
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Payment not completing**
   - Check IPN URL is accessible
   - Verify webhook signature
   - Check database logs

2. **Credits not added**
   - Check transaction logs
   - Verify IPN was received
   - Check user balance manually

3. **Webhook signature invalid**
   - Verify hash secret
   - Check parameter sorting
   - Log raw webhook data

### VNPay Support

- **Hotline**: 1900 55 55 77
- **Email**: support@vnpay.vn
- **Documentation**: https://sandbox.vnpayment.vn/apis/docs

---

## ✅ Final Checklist

- [ ] VNPay account registered
- [ ] Database tables created
- [ ] Backend entities implemented
- [ ] VNPay service implemented
- [ ] Payment service implemented
- [ ] Controllers created
- [ ] Frontend pages created
- [ ] Testing completed
- [ ] Security measures implemented
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Production deployment
- [ ] VNPay production configured
- [ ] End-to-end testing in production

---

**🎉 Congratulations! Your VNPay payment system is ready!**

For Stripe integration, follow similar patterns and use the Stripe service structure provided above.
