import { PaymentStatus } from '../enums/payment-status.enum';

/**
 * Payment request
 */
export interface PaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  userId: string;
}

/**
 * Payment response
 */
export interface PaymentResponse {
  transactionId: string;
  status: PaymentStatus;
  paymentUrl?: string;
  externalTransactionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Refund request
 */
export interface RefundRequest {
  transactionId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

/**
 * Refund response
 */
export interface RefundResponse {
  refundId: string;
  status: PaymentStatus;
  amount: number;
  externalRefundId?: string;
}

/**
 * Payment provider interface
 */
export interface IPaymentProvider {
  /**
   * Process payment
   */
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  
  /**
   * Process refund
   */
  processRefund(request: RefundRequest): Promise<RefundResponse>;
  
  /**
   * Get payment status
   */
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  
  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: any, signature: string): Promise<boolean>;
  
  /**
   * Handle webhook event
   */
  handleWebhook(event: any): Promise<void>;
}

