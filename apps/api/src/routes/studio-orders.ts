import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';
import type { OrderV2, OrderStatus } from '@blueflutes/shared';

export const studioOrdersRouter: Router = Router();

const COMMISSION_PCT = 8;

function calcPayout(subtotal: number, printCost: number, commissionPct: number) {
  const commission = Math.round((subtotal - printCost) * (commissionPct / 100));
  return { printCost, commission, amount: subtotal - printCost - commission };
}

function makeStubOrders(tenantId: string): OrderV2[] {
  const now = new Date();
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  const stubShipping = {
    id: 'sm-standard',
    label: 'Standard',
    estimate: '5–8 business days',
    price: 1200,
  };

  return [
    {
      id: `${tenantId}-ord-001`,
      number: 'BF-10001',
      photographerId: tenantId,
      buyer: { email: 'alice@example.com', name: 'Alice Williams', handle: 'alice_w' },
      status: 'delivered' as OrderStatus,
      subtotal: 18500,
      shipping: 1200,
      tax: 0,
      total: 19700,
      currency: 'USD',
      items: [{ id: 'item-001', photoId: 'photo-001', printOptionId: 'po-16x20', title: 'Golden Hour, Yosemite', thumbUrl: 'https://images.pexels.com/photos/1070378/pexels-photo-1070378.jpeg?auto=compress&cs=tinysrgb&w=200', size: '16×20"', kind: 'Archival matte', qty: 1, unitPrice: 18500, lineTotal: 18500 }],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(12) },
        { status: 'in_production' as OrderStatus, at: d(10) },
        { status: 'shipped' as OrderStatus, at: d(7) },
        { status: 'delivered' as OrderStatus, at: d(3) },
      ],
      shippingAddress: { name: 'Alice Williams', line1: '123 Maple St', city: 'San Francisco', region: 'CA', postcode: '94102', country: 'US' },
      shippingMethod: stubShipping,
      trackingUrl: 'https://tracking.example.com/ABC123',
      payout: calcPayout(18500, 4200, COMMISSION_PCT),
      createdAt: d(12),
    },
    {
      id: `${tenantId}-ord-002`,
      number: 'BF-10002',
      photographerId: tenantId,
      buyer: { email: 'bob@example.com', name: 'Bob Kim', handle: 'bob_k' },
      status: 'shipped' as OrderStatus,
      subtotal: 9800,
      shipping: 1200,
      tax: 0,
      total: 11000,
      currency: 'USD',
      items: [{ id: 'item-002', photoId: 'photo-002', printOptionId: 'po-8x10', title: 'Blue Ridge at Dawn', thumbUrl: 'https://images.pexels.com/photos/26311729/pexels-photo-26311729.jpeg?auto=compress&cs=tinysrgb&w=200', size: '8×10"', kind: 'Archival matte', qty: 2, unitPrice: 4900, lineTotal: 9800 }],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(5) },
        { status: 'in_production' as OrderStatus, at: d(4) },
        { status: 'shipped' as OrderStatus, at: d(1) },
      ],
      shippingAddress: { name: 'Bob Kim', line1: '456 Oak Ave', line2: 'Apt 2B', city: 'New York', region: 'NY', postcode: '10001', country: 'US' },
      shippingMethod: stubShipping,
      trackingUrl: 'https://tracking.example.com/DEF456',
      payout: calcPayout(9800, 2400, COMMISSION_PCT),
      createdAt: d(5),
    },
    {
      id: `${tenantId}-ord-003`,
      number: 'BF-10003',
      photographerId: tenantId,
      buyer: { email: 'carol@example.com', name: 'Carol Martinez' },
      status: 'in_production' as OrderStatus,
      subtotal: 24000,
      shipping: 1200,
      tax: 0,
      total: 25200,
      currency: 'USD',
      items: [{ id: 'item-003', photoId: 'photo-003', printOptionId: 'po-24x36', title: 'Midnight Forest', thumbUrl: 'https://images.pexels.com/photos/38271767/pexels-photo-38271767.jpeg?auto=compress&cs=tinysrgb&w=200', size: '24×36"', kind: 'Archival matte', qty: 1, unitPrice: 24000, lineTotal: 24000 }],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(2) },
        { status: 'in_production' as OrderStatus, at: d(1) },
      ],
      shippingAddress: { name: 'Carol Martinez', line1: '789 Pine Rd', city: 'Austin', region: 'TX', postcode: '78701', country: 'US' },
      shippingMethod: stubShipping,
      payout: calcPayout(24000, 7500, COMMISSION_PCT),
      createdAt: d(2),
    },
    {
      id: `${tenantId}-ord-004`,
      number: 'BF-10004',
      photographerId: tenantId,
      buyer: { email: 'dave@example.com', name: 'Dave Patel', handle: 'dave_p' },
      status: 'paid' as OrderStatus,
      subtotal: 5500,
      shipping: 1200,
      tax: 0,
      total: 6700,
      currency: 'USD',
      items: [{ id: 'item-004', photoId: 'photo-004', printOptionId: 'po-5x7', title: 'Coastal Fog', thumbUrl: 'https://images.pexels.com/photos/1769106/pexels-photo-1769106.jpeg?auto=compress&cs=tinysrgb&w=200', size: '5×7"', kind: 'Archival matte', qty: 1, unitPrice: 5500, lineTotal: 5500 }],
      timeline: [{ status: 'paid' as OrderStatus, at: d(0) }],
      shippingAddress: { name: 'Dave Patel', line1: '321 Elm St', city: 'Seattle', region: 'WA', postcode: '98101', country: 'US' },
      shippingMethod: stubShipping,
      payout: calcPayout(5500, 900, COMMISSION_PCT),
      createdAt: d(0),
    },
    {
      id: `${tenantId}-ord-005`,
      number: 'BF-10005',
      photographerId: tenantId,
      buyer: { email: 'eve@example.com', name: 'Eve Thompson', handle: 'eve_t' },
      status: 'refunded' as OrderStatus,
      subtotal: 12000,
      shipping: 1200,
      tax: 0,
      total: 13200,
      currency: 'USD',
      items: [{ id: 'item-005', photoId: 'photo-005', printOptionId: 'po-12x16', title: 'Storm Over Plains', thumbUrl: 'https://images.pexels.com/photos/29202983/pexels-photo-29202983.jpeg?auto=compress&cs=tinysrgb&w=200', size: '12×16"', kind: 'Archival matte', qty: 1, unitPrice: 12000, lineTotal: 12000 }],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(20) },
        { status: 'in_production' as OrderStatus, at: d(18) },
        { status: 'refunded' as OrderStatus, at: d(15) },
      ],
      shippingAddress: { name: 'Eve Thompson', line1: '555 River Dr', city: 'Chicago', region: 'IL', postcode: '60601', country: 'US' },
      shippingMethod: stubShipping,
      payout: calcPayout(12000, 3000, COMMISSION_PCT),
      createdAt: d(20),
    },
  ];
}

// GET /me/orders?status=&cursor=
studioOrdersRouter.get('/me/orders', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const tenantId = req.tenant?.id ?? 'default';

  const statusFilter = req.query['status'] as string | undefined;
  let orders = makeStubOrders(tenantId);

  if (statusFilter && statusFilter !== 'all') {
    orders = orders.filter((o) => o.status === statusFilter);
  }

  res.json({ data: orders.slice(0, 25), error: null });
}));

// GET /me/orders/:id
studioOrdersRouter.get('/me/orders/:id', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const tenantId = req.tenant?.id ?? 'default';

  const orders = makeStubOrders(tenantId);
  const order = orders.find((o) => o.id === req.params['id']);

  if (!order) throw AppError.notFound('Order not found');

  res.json({ data: order, error: null });
}));

// POST /me/orders/:id/refund
studioOrdersRouter.post('/me/orders/:id/refund', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const tenantId = req.tenant?.id ?? 'default';

  const orders = makeStubOrders(tenantId);
  const order = orders.find((o) => o.id === req.params['id']);

  if (!order) throw AppError.notFound('Order not found');

  if (order.status === 'refunded') {
    res.status(409).json({ data: null, error: { code: 'ALREADY_REFUNDED', message: 'Order is already refunded' } });
    return;
  }

  const updatedOrder: OrderV2 = {
    ...order,
    status: 'refunded',
    timeline: [...order.timeline, { status: 'refunded' as OrderStatus, at: new Date().toISOString() }],
  };

  res.json({ data: updatedOrder, error: null });
}));
