import type { PaymentProcessor } from './types.js';

export class StubPaymentProcessor implements PaymentProcessor {
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    orderId: string;
    buyerEmail: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    return {
      clientSecret: `stub_secret_${params.orderId}`,
      paymentIntentId: `pi_stub_${params.orderId}`,
    };
  }
}
