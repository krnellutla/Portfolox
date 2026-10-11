export type { PaymentProcessor } from './types.js';
export { StubPaymentProcessor } from './stub.js';

import { StubPaymentProcessor } from './stub.js';
import type { PaymentProcessor } from './types.js';

export function createPaymentProcessor(): PaymentProcessor {
  const processor = process.env['PAYMENT_PROCESSOR'] ?? 'stub';
  if (processor === 'stub') {
    return new StubPaymentProcessor();
  }
  // Future: return new StripePaymentProcessor();
  throw new Error(`Unknown payment processor: ${processor}`);
}
