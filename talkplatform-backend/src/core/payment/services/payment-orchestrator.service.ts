import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IPaymentProvider, PaymentRequest, PaymentResponse } from '../interfaces/payment-provider.interface';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);
  private readonly providers = new Map<string, IPaymentProvider>();

  /**
   * Register a payment provider
   */
  registerProvider(name: string, provider: IPaymentProvider): void {
    this.providers.set(name, provider);
    this.logger.log(`Payment provider ${name} registered`);
  }

  /**
   * Get payment provider
   */
  getProvider(name: string): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`Payment provider ${name} not found`);
    }
    return provider;
  }

  /**
   * Process payment with specified provider
   */
  async processPayment(
    providerName: string,
    request: PaymentRequest,
  ): Promise<PaymentResponse> {
    const provider = this.getProvider(providerName);
    return provider.processPayment(request);
  }

  /**
   * Process refund with specified provider
   */
  async processRefund(
    providerName: string,
    transactionId: string,
    amount?: number,
  ): Promise<any> {
    const provider = this.getProvider(providerName);
    return provider.processRefund({
      transactionId,
      amount,
    });
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

