import { UseGuards, applyDecorators } from '@nestjs/common';
import { PaymentGuard } from '../guards/payment.guard';

/**
 * Decorator to require payment for a route
 */
export const RequirePayment = () => applyDecorators(UseGuards(PaymentGuard));

