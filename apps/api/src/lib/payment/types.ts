export interface PaymentProcessor {
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    orderId: string;
    buyerEmail: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string }>;
}
