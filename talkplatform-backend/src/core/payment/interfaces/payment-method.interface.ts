/**
 * Payment method types
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  E_WALLET = 'e_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
}

/**
 * Payment method interface
 */
export interface IPaymentMethod {
  type: PaymentMethodType;
  provider: string;
  last4?: string; // Last 4 digits of card
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

