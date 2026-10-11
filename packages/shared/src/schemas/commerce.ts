import { z } from 'zod';

// PhotoPrintOption — returned to buyers (no printCost)
export const PhotoPrintOptionSchema = z.object({
  id: z.string().uuid(),
  photoId: z.string().uuid(),
  size: z.string(),
  kind: z.string(),
  framed: z.boolean(),
  price: z.number().int().nonnegative(),
  currency: z.string().length(3),
});
export type PhotoPrintOption = z.infer<typeof PhotoPrintOptionSchema>;

// CartItem
export const CartItemSchema = z.object({
  id: z.string().uuid(),
  photoId: z.string().uuid(),
  printOptionId: z.string().uuid(),
  title: z.string(),
  thumbUrl: z.string().url(),
  size: z.string(),
  kind: z.string(),
  qty: z.number().int().min(1).max(10),
  unitPrice: z.number().int().nonnegative(),
  lineTotal: z.number().int().nonnegative(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

// Cart
export const CartSchema = z.object({
  id: z.string().uuid(),
  photographerId: z.string().uuid(),
  items: z.array(CartItemSchema),
  subtotal: z.number().int().nonnegative(),
  currency: z.string().length(3),
  itemCount: z.number().int().nonnegative(),
});
export type Cart = z.infer<typeof CartSchema>;

// Address
export const AddressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  region: z.string().min(1),
  postcode: z.string().min(1),
  country: z.string().length(2),
});
export type Address = z.infer<typeof AddressSchema>;

// ShippingMethod
export const ShippingMethodSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  estimate: z.string(),
  price: z.number().int().nonnegative(),
});
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

// OrderStatus
export const OrderStatusSchema = z.enum(['paid', 'in_production', 'shipped', 'delivered', 'refunded']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// OrderEvent
export const OrderEventSchema = z.object({
  status: OrderStatusSchema,
  at: z.string().datetime(),
});
export type OrderEvent = z.infer<typeof OrderEventSchema>;

// OrderV2 — buyer view (no payout)
export const OrderV2Schema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  photographerId: z.string().uuid(),
  buyer: z.object({ email: z.string().email(), name: z.string(), handle: z.string().optional() }),
  items: z.array(CartItemSchema),
  shippingAddress: AddressSchema,
  shippingMethod: ShippingMethodSchema,
  subtotal: z.number().int().nonnegative(),
  shipping: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  currency: z.string().length(3),
  status: OrderStatusSchema,
  timeline: z.array(OrderEventSchema),
  trackingUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  payout: z.object({
    printCost: z.number().int().nonnegative(),
    commission: z.number().int().nonnegative(),
    amount: z.number().int().nonnegative(),
  }).optional(),
});
export type OrderV2 = z.infer<typeof OrderV2Schema>;

// Request schemas (for API validation)
export const AddToCartSchema = z.object({
  photoId: z.string().uuid(),
  printOptionId: z.string().uuid(),
  qty: z.number().int().min(1).max(10),
});
export type AddToCart = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  qty: z.number().int().min(1).max(10),
});
export type UpdateCartItem = z.infer<typeof UpdateCartItemSchema>;

export const CheckoutSessionSchema = z.object({
  email: z.string().email(),
  shippingAddress: AddressSchema,
  shippingMethodId: z.string().uuid(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;
