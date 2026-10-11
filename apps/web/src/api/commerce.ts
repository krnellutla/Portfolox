import { z } from 'zod';
import {
  PhotoPrintOptionSchema,
  CartSchema,
  ShippingMethodSchema,
  OrderV2Schema,
  type AddToCart,
  type UpdateCartItem,
  type CheckoutSession,
} from '@blueflutes/shared';
import { apiFetch } from './client.js';

const printOptionsListSchema = z.array(PhotoPrintOptionSchema);
const shippingMethodsListSchema = z.array(ShippingMethodSchema);

const checkoutResultSchema = z.object({
  orderId: z.string().uuid(),
  clientSecret: z.string(),
  orderToken: z.string(),
});

export function getPrintOptions(photoId: string) {
  return apiFetch(`/photos/${photoId}/print-options`, {}, printOptionsListSchema);
}

export function getCart() {
  return apiFetch('/cart', {}, CartSchema);
}

export function addToCart(body: AddToCart) {
  return apiFetch('/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, CartSchema);
}

export function updateCartItem(id: string, body: UpdateCartItem) {
  return apiFetch(`/cart/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, CartSchema);
}

export function removeCartItem(id: string) {
  return apiFetch(`/cart/items/${id}`, { method: 'DELETE' }, CartSchema);
}

export function getShippingMethods(params: { country?: string; postcode?: string } = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch(`/checkout/shipping-methods${qs ? `?${qs}` : ''}`, {}, shippingMethodsListSchema);
}

export function createCheckoutSession(body: CheckoutSession) {
  return apiFetch('/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, checkoutResultSchema);
}

export function getOrder(id: string, token?: string) {
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return apiFetch(`/orders/${id}${qs}`, {}, OrderV2Schema);
}
