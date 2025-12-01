# 💳 Payment Gateway Integration - Complete Guide

**VNPay (Vietnam) & Stripe (International)**

---

## 📚 Documentation Index

### VNPay Integration (Vietnamese Market)

| Document | Description | Status |
|----------|-------------|--------|
| **[Part 1: Setup & Backend](./PAYMENT_GATEWAY_VNPAY.md)** | VNPay registration, database schema, entities, services | ✅ Complete |
| **[Part 2: Controllers & Frontend](./PAYMENT_GATEWAY_VNPAY_PART2.md)** | API controllers, React pages, testing | ✅ Complete |
| **[Part 3: Production & Security](./PAYMENT_GATEWAY_VNPAY_PART3.md)** | Deployment, security, monitoring, Stripe prep | ✅ Complete |

### Stripe Integration (International Market)

| Document | Description | Status |
|----------|-------------|--------|
| **Stripe Setup Guide** | Registration, API keys, webhooks | 📅 Coming soon |
| **Stripe Implementation** | Backend & frontend integration | 📅 Coming soon |
| **Multi-Currency Support** | USD, EUR, GBP support | 📅 Coming soon |

---

## 🎯 Quick Start

### For VNPay (Vietnam)

1. **Read Part 1** - Setup VNPay account and implement backend
2. **Read Part 2** - Create controllers and frontend pages
3. **Read Part 3** - Deploy to production with security

### For Stripe (International)

Coming soon - Will be added when team provides Stripe integration

---

## 💰 Payment Flow Overview

### VNPay Flow (Vietnamese Dong)

```
Student → Select Package → VNPay Gateway
    ↓
Pay via Bank (ATM/Internet Banking)
    ↓
VNPay IPN → Backend verifies → Add credits
    ↓
Student redirected → Success page
```

### Stripe Flow (USD/International)

```
Student → Select Package → Stripe Checkout
    ↓
Pay via Card (Visa/Mastercard)
    ↓
Stripe Webhook → Backend verifies → Add credits
    ↓
Student redirected → Success page
```

---

## 📊 Credit Packages

| Package | Credits | Price (VND) | Price (USD) | Bonus |
|---------|---------|-------------|-------------|-------|
| Starter | 10 | 100,000₫ | $4 | - |
| Basic | 50 | 450,000₫ | $18 | +10% |
| Pro | 100 | 850,000₫ | $34 | +15% |
| Premium | 200 | 1,600,000₫ | $64 | +20% |

**Note**: 1 credit = $1 USD ≈ 25,000 VND

---

## 🗄️ Database Schema

### Core Tables

1. **credit_packages** - Available credit packages
2. **payment_transactions** - All payment records
3. **payment_logs** - Event logging
4. **credit_transactions** - Credit movement history

### Entity Relationships

```
User
  ├── has many PaymentTransactions
  └── has many CreditTransactions

CreditPackage
  └── has many PaymentTransactions

PaymentTransaction
  ├── belongs to User
  ├── belongs to CreditPackage
  └── creates CreditTransaction (on success)
```

---

## 🔧 Implementation Status

### ✅ Completed (VNPay)

- [x] Database schema design
- [x] Entity definitions
- [x] VNPay service (create payment, verify signature)
- [x] Payment service (handle IPN, add credits)
- [x] Controllers (create payment, return, IPN)
- [x] Frontend pages (buy credits, payment result)
- [x] Security (IP whitelist, signature verification)
- [x] Logging & monitoring
- [x] Error handling
- [x] Testing guide
- [x] Production deployment guide

### 📅 Pending (Stripe)

- [ ] Stripe service implementation
- [ ] Multi-currency support
- [ ] Stripe webhook handler
- [ ] Frontend Stripe integration
- [ ] Testing with Stripe sandbox
- [ ] Production deployment

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- VNPay merchant account (sandbox for testing)
- Stripe account (for international payments - coming soon)

### Installation

```bash
# 1. Install dependencies
cd talkplatform-backend
npm install crypto querystring moment

# 2. Configure environment
cp .env.example .env
# Edit .env with VNPay credentials

# 3. Run migrations
npm run migration:run

# 4. Start backend
npm run start:dev

# 5. Start frontend
cd ../talkplatform-frontend
npm run dev
```

### Configuration

**Backend (.env)**:
```env
# VNPay
VNPAY_TMN_CODE=DEMO
VNPAY_HASH_SECRET=DEMOSECRETKEY
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/payment/vnpay/return
VNPAY_IPN_URL=http://localhost:3000/api/payment/vnpay/ipn

# Stripe (coming soon)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🧪 Testing

### VNPay Sandbox

1. **Get test credentials** from https://sandbox.vnpayment.vn/
2. **Test card details**:
   - Bank: NCB
   - Card: `9704198526191432198`
   - Name: `NGUYEN VAN A`
   - Date: `07/15`
   - OTP: `123456`

3. **Test flow**:
   ```bash
   # Create payment
   curl -X POST http://localhost:3000/api/payment/vnpay/create \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"packageId":"PACKAGE_ID"}'
   
   # Open returned paymentUrl in browser
   # Complete payment with test card
   # Verify credits added
   ```

### Stripe Sandbox (Coming Soon)

Will be added when Stripe integration is implemented.

---

## 📈 Monitoring

### Key Metrics

1. **Payment Success Rate**
   - Target: >95%
   - Alert if <90%

2. **Average Transaction Value**
   - Track by package
   - Identify popular packages

3. **Failed Payment Reasons**
   - Analyze VNPay response codes
   - Improve user experience

4. **Revenue Tracking**
   - Daily/Weekly/Monthly revenue
   - Revenue by payment method

### Monitoring Tools

- **Application Logs**: PM2 logs
- **Database**: Payment transaction table
- **Analytics**: Custom dashboard (to be built)
- **Alerts**: Email/Slack notifications

---

## 🔒 Security

### VNPay Security

- ✅ Signature verification on all webhooks
- ✅ IP whitelist for IPN endpoint
- ✅ HTTPS only in production
- ✅ Secure hash secret storage
- ✅ Transaction idempotency
- ✅ Comprehensive logging

### Stripe Security (Coming Soon)

- [ ] Webhook signature verification
- [ ] PCI compliance
- [ ] 3D Secure support
- [ ] Fraud detection

---

## 📞 Support

### VNPay Support

- **Hotline**: 1900 55 55 77
- **Email**: support@vnpay.vn
- **Docs**: https://sandbox.vnpayment.vn/apis/docs

### Stripe Support

- **Docs**: https://stripe.com/docs
- **Support**: https://support.stripe.com

### Internal Support

- **Backend Issues**: Check logs in `payment_logs` table
- **Frontend Issues**: Check browser console
- **Payment Issues**: Check `payment_transactions` table

---

## 🎓 Best Practices

### 1. Always Use Transactions

```typescript
await this.dataSource.transaction(async (manager) => {
  // Update payment
  // Update user credits
  // Create transaction log
});
```

### 2. Implement Idempotency

```typescript
// Check if already processed
if (payment.status === 'completed') {
  return { RspCode: '02', Message: 'Already processed' };
}
```

### 3. Log Everything

```typescript
this.logger.log(`Payment created: ${txnRef}`);
this.logger.log(`Payment completed: ${txnRef}`);
this.logger.error(`Payment failed: ${txnRef}`);
```

### 4. Handle Errors Gracefully

```typescript
try {
  await this.processPayment();
} catch (error) {
  await this.handleError(error, txnRef);
  return userFriendlyError;
}
```

---

## 🗺️ Roadmap

### Phase 1: VNPay Integration ✅

- [x] VNPay payment gateway
- [x] Credit packages
- [x] Payment history
- [x] Security implementation
- [x] Production deployment

### Phase 2: Stripe Integration 📅

- [ ] Stripe payment gateway
- [ ] Multi-currency support
- [ ] International cards
- [ ] Subscription support

### Phase 3: Advanced Features 📅

- [ ] Promotional codes
- [ ] Referral bonuses
- [ ] Bulk purchase discounts
- [ ] Gift credits
- [ ] Auto-recharge

### Phase 4: Analytics 📅

- [ ] Revenue dashboard
- [ ] Payment analytics
- [ ] User spending patterns
- [ ] Conversion tracking

---

## 📝 API Reference

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/payment/packages` | No | Get credit packages |
| POST | `/payment/vnpay/create` | Yes | Create VNPay payment |
| GET | `/payment/vnpay/return` | No | VNPay return URL |
| POST | `/payment/vnpay/ipn` | No | VNPay IPN webhook |
| GET | `/payment/history` | Yes | Payment history |

### Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🎉 Success Criteria

### VNPay Integration

- [x] Can create payment URL
- [x] Can process successful payments
- [x] Can handle failed payments
- [x] Credits added correctly
- [x] Transaction logs created
- [x] Security measures in place
- [x] Production ready

### Stripe Integration (Coming Soon)

- [ ] Can create payment intent
- [ ] Can process card payments
- [ ] Can handle webhooks
- [ ] Multi-currency support
- [ ] Production ready

---

## 📚 Additional Resources

- [VNPay API Documentation](https://sandbox.vnpayment.vn/apis/docs)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Payment Security Best Practices](https://owasp.org/www-project-payment-security/)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)

---

**Status**: VNPay ✅ Complete | Stripe 📅 Coming Soon

**Last Updated**: 2025-12-01

**Maintainer**: Development Team
