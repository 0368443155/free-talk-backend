# 💳 Dual Payment System - Credits & Direct Payment

**Version**: 1.0  
**Status**: 🆕 **ENHANCEMENT**  
**Priority**: High  
**Estimated Time**: 3-4 days

---

## 📋 Overview

Hỗ trợ **2 phương thức thanh toán** cho TẤT CẢ giao dịch:
1. **Credits** (nạp trước, dùng sau)
2. **Direct Payment** (thanh toán trực tiếp qua thẻ/ngân hàng)

---

## 🎯 Áp dụng cho:

✅ **Courses** - Enroll full course / Buy per session  
✅ **Marketplace Materials** - Mua tài liệu  
✅ **1-on-1 Bookings** - Đặt lịch với teacher  
✅ **Subscriptions** - Gói premium (nếu có)

---

## 💰 Payment Flow Comparison

### Option 1: Credits (Current)

```
User has 100 credits
      ↓
Buy course (50 credits)
      ↓
Deduct: balance = 50 credits
      ↓
Create PaymentHold (escrow)
      ↓
Session completed
      ↓
Release to teacher
```

### Option 2: Direct Payment (New)

```
User clicks "Buy with Card"
      ↓
Redirect to Payment Gateway
      ↓
User pays $50 via Stripe/PayPal
      ↓
Payment successful
      ↓
Create PaymentHold (escrow)
      ↓
Session completed
      ↓
Transfer to teacher's bank
```

---

## 🗄️ Database Changes

### 1. Update `users` table

```sql
ALTER TABLE users 
ADD COLUMN payment_method_preference ENUM('credits', 'direct', 'both') DEFAULT 'credits',
ADD COLUMN stripe_customer_id VARCHAR(255),
ADD COLUMN paypal_email VARCHAR(255);
```

### 2. Update `transactions` table

```sql
ALTER TABLE transactions
ADD COLUMN payment_method ENUM('credits', 'stripe', 'paypal', 'bank_transfer') NOT NULL,
ADD COLUMN payment_gateway_id VARCHAR(255),
ADD COLUMN payment_gateway_status VARCHAR(50),
ADD COLUMN payment_gateway_response JSON;
```

### 3. Update `payment_holds` table

```sql
ALTER TABLE payment_holds
ADD COLUMN payment_method ENUM('credits', 'stripe', 'paypal') NOT NULL,
ADD COLUMN payment_gateway_id VARCHAR(255),
ADD COLUMN payment_intent_id VARCHAR(255);
```

---

## 🔧 Implementation

### 1. Payment Service

**File**: `src/core/payments/payment.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

export enum PaymentMethod {
  CREDITS = 'credits',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Process payment with selected method
   */
  async processPayment(params: {
    user_id: string;
    amount: number;
    payment_method: PaymentMethod;
    description: string;
    reference_type: string;
    reference_id: string;
  }) {
    switch (params.payment_method) {
      case PaymentMethod.CREDITS:
        return await this.payWithCredits(params);
      
      case PaymentMethod.STRIPE:
        return await this.payWithStripe(params);
      
      case PaymentMethod.PAYPAL:
        return await this.payWithPayPal(params);
      
      default:
        throw new Error('Invalid payment method');
    }
  }

  /**
   * Pay with Credits (existing logic)
   */
  private async payWithCredits(params: any) {
    const user = await this.userRepository.findOne({
      where: { id: params.user_id },
    });

    // Check balance
    if (user.credit_balance < params.amount) {
      throw new BadRequestException('Insufficient credits');
    }

    // Deduct credits
    await this.userRepository.update(params.user_id, {
      credit_balance: () => `credit_balance - ${params.amount}`,
    });

    // Create transaction
    const transaction = await this.transactionRepository.save({
      user_id: params.user_id,
      type: TransactionType.PURCHASE,
      amount: -params.amount,
      balance_before: user.credit_balance,
      balance_after: user.credit_balance - params.amount,
      payment_method: PaymentMethod.CREDITS,
      status: TransactionStatus.COMPLETED,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      description: params.description,
      completed_at: new Date(),
    });

    return {
      success: true,
      transaction_id: transaction.id,
      payment_method: PaymentMethod.CREDITS,
    };
  }

  /**
   * Pay with Stripe
   */
  private async payWithStripe(params: any) {
    const user = await this.userRepository.findOne({
      where: { id: params.user_id },
    });

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
      
      await this.userRepository.update(user.id, {
        stripe_customer_id: customerId,
      });
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      description: params.description,
      metadata: {
        user_id: params.user_id,
        reference_type: params.reference_type,
        reference_id: params.reference_id,
      },
    });

    // Create pending transaction
    const transaction = await this.transactionRepository.save({
      user_id: params.user_id,
      type: TransactionType.PURCHASE,
      amount: -params.amount,
      balance_before: 0,
      balance_after: 0,
      payment_method: PaymentMethod.STRIPE,
      payment_gateway_id: paymentIntent.id,
      payment_gateway_status: paymentIntent.status,
      status: TransactionStatus.PENDING,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      description: params.description,
    });

    return {
      success: false, // Not completed yet
      transaction_id: transaction.id,
      payment_method: PaymentMethod.STRIPE,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    };
  }

  /**
   * Confirm Stripe payment (webhook)
   */
  async confirmStripePayment(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update transaction
      await this.transactionRepository.update(
        { payment_gateway_id: paymentIntentId },
        {
          status: TransactionStatus.COMPLETED,
          payment_gateway_status: 'succeeded',
          completed_at: new Date(),
        },
      );

      return { success: true };
    }

    return { success: false };
  }

  /**
   * Pay with PayPal (similar implementation)
   */
  private async payWithPayPal(params: any) {
    // Implement PayPal SDK integration
    // Similar to Stripe flow
  }
}
```

---

## 🎨 Frontend UI

### Payment Method Selection

```typescript
interface PaymentMethodSelectorProps {
  amount: number;
  userBalance: number;
  onSelect: (method: PaymentMethod) => void;
}

function PaymentMethodSelector({ amount, userBalance, onSelect }: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credits');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Select Payment Method</h3>
      
      {/* Credits Option */}
      <Card 
        className={`cursor-pointer ${selectedMethod === 'credits' ? 'border-blue-500' : ''}`}
        onClick={() => setSelectedMethod('credits')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5" />
              <div>
                <p className="font-medium">Pay with Credits</p>
                <p className="text-sm text-gray-500">
                  Balance: {userBalance} credits
                </p>
              </div>
            </div>
            {userBalance >= amount ? (
              <Badge variant="success">Available</Badge>
            ) : (
              <Badge variant="destructive">Insufficient</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Option */}
      <Card 
        className={`cursor-pointer ${selectedMethod === 'stripe' ? 'border-blue-500' : ''}`}
        onClick={() => setSelectedMethod('stripe')}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5" />
            <div>
              <p className="font-medium">Pay with Card</p>
              <p className="text-sm text-gray-500">
                Visa, Mastercard, Amex
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PayPal Option */}
      <Card 
        className={`cursor-pointer ${selectedMethod === 'paypal' ? 'border-blue-500' : ''}`}
        onClick={() => setSelectedMethod('paypal')}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <img src="/paypal-logo.svg" className="w-5 h-5" />
            <div>
              <p className="font-medium">Pay with PayPal</p>
              <p className="text-sm text-gray-500">
                Fast & secure
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={() => onSelect(selectedMethod)}
        className="w-full"
        disabled={selectedMethod === 'credits' && userBalance < amount}
      >
        Continue with {selectedMethod}
      </Button>
    </div>
  );
}
```

---

## 🔄 Updated Enrollment Flow

### Enroll in Course

**Endpoint**: `POST /api/enrollments/courses/:courseId`

**Request Body**:
```json
{
  "payment_method": "stripe"  // or "credits" or "paypal"
}
```

**Response (Credits)**:
```json
{
  "success": true,
  "enrollment_id": "uuid",
  "payment_method": "credits",
  "amount_paid": 100
}
```

**Response (Stripe)**:
```json
{
  "success": false,
  "enrollment_id": "uuid",
  "payment_method": "stripe",
  "client_secret": "pi_xxx_secret_xxx",
  "payment_intent_id": "pi_xxx",
  "amount": 100
}
```

**Frontend Flow**:
```typescript
async function enrollInCourse(courseId: string, paymentMethod: PaymentMethod) {
  const response = await enrollApi(courseId, { payment_method: paymentMethod });

  if (paymentMethod === 'credits') {
    // Immediate success
    toast.success('Enrolled successfully!');
    router.push('/student/my-learning');
  } else if (paymentMethod === 'stripe') {
    // Show Stripe payment form
    const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
    const { error } = await stripe.confirmCardPayment(response.client_secret);
    
    if (error) {
      toast.error('Payment failed');
    } else {
      toast.success('Payment successful! Enrolled in course.');
      router.push('/student/my-learning');
    }
  }
}
```

---

## 📊 Pricing Display

```typescript
function CoursePrice({ course }: { course: Course }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">${course.price_full_course}</span>
        <span className="text-gray-500">or</span>
        <span className="text-2xl font-bold text-blue-600">
          {course.price_full_course} credits
        </span>
      </div>
      <p className="text-sm text-gray-500">
        1 credit = $1 USD
      </p>
    </div>
  );
}
```

---

## 🔐 Stripe Webhook

**Endpoint**: `POST /api/webhooks/stripe`

```typescript
@Post('webhooks/stripe')
async handleStripeWebhook(@Req() req: any) {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = this.stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    throw new BadRequestException('Invalid signature');
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.paymentService.confirmStripePayment(event.data.object.id);
      break;
    
    case 'payment_intent.payment_failed':
      // Handle failed payment
      break;
  }

  return { received: true };
}
```

---

## 💳 Credit Purchase (Top-up)

**Endpoint**: `POST /api/credits/purchase`

**Request**:
```json
{
  "amount": 100,
  "payment_method": "stripe"
}
```

**Flow**:
1. User selects credit amount ($100 = 100 credits)
2. Choose payment method (Stripe/PayPal)
3. Complete payment
4. Credits added to balance

---

## 📋 Implementation Checklist

### Backend:
- [ ] Install Stripe SDK: `npm install stripe`
- [ ] Install PayPal SDK: `npm install @paypal/checkout-server-sdk`
- [ ] Create `PaymentService`
- [ ] Update database tables (add payment_method columns)
- [ ] Update enrollment flow to support both methods
- [ ] Create Stripe webhook handler
- [ ] Create PayPal webhook handler
- [ ] Add credit purchase endpoint

### Frontend:
- [ ] Install Stripe.js: `npm install @stripe/stripe-js`
- [ ] Create `PaymentMethodSelector` component
- [ ] Create Stripe payment form
- [ ] Create PayPal button
- [ ] Update enrollment UI
- [ ] Add credit purchase page
- [ ] Handle payment confirmations

---

## 🎯 Benefits

✅ **Flexibility**: Users choose preferred payment method  
✅ **No Lock-in**: Don't need to buy credits first  
✅ **Better UX**: Direct payment for one-time purchases  
✅ **Credits for Regulars**: Bulk discount for frequent users  
✅ **Global Support**: Stripe/PayPal work worldwide  

---

## 💡 Pricing Strategy

### Credits (Bulk Discount)
```
$10  = 11 credits  (10% bonus)
$50  = 55 credits  (10% bonus)
$100 = 115 credits (15% bonus)
$500 = 600 credits (20% bonus)
```

### Direct Payment
```
Course: $100 (no discount)
Material: $20 (no discount)
```

**Encourage credits** = Better for platform (upfront payment)

---

**End of Dual Payment System Guide**
