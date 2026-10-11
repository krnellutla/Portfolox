import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';
import type { OrderV2, OrderStatus, OrderTimelineStep } from '@blueflutes/shared';

export const studioOrdersRouter: Router = Router();

const COMMISSION_PCT = 8;

// Stub orders data — replace with DB queries in R6
function makeStubOrders(tenantId: string): OrderV2[] {
  const now = new Date();
  const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

  return [
    {
      id: `${tenantId}-ord-001`,
      number: 'ORD-2024-001',
      buyerHandle: 'alice_w',
      buyerEmail: 'alice@example.com',
      status: 'delivered' as OrderStatus,
      subtotal: 18500,
      items: [
        {
          id: 'item-001',
          printOptionId: 'po-16x20',
          title: 'Golden Hour, Yosemite',
          size: '16×20"',
          thumbUrl: null,
          qty: 1,
          unitPrice: 18500,
          printCost: 4200,
        },
      ],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(12) },
        { status: 'in_production' as OrderStatus, at: d(10) },
        { status: 'shipped' as OrderStatus, at: d(7) },
        { status: 'delivered' as OrderStatus, at: d(3) },
      ] as OrderTimelineStep[],
      shippingAddress: {
        name: 'Alice Williams',
        line1: '123 Maple St',
        line2: null,
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
      },
      trackingUrl: 'https://tracking.example.com/ABC123',
      payout: calcPayout(18500, 4200, COMMISSION_PCT),
      createdAt: d(12),
    },
    {
      id: `${tenantId}-ord-002`,
      number: 'ORD-2024-002',
      buyerHandle: 'bob_k',
      buyerEmail: 'bob@example.com',
      status: 'shipped' as OrderStatus,
      subtotal: 9800,
      items: [
        {
          id: 'item-002',
          printOptionId: 'po-8x10',
          title: 'Blue Ridge at Dawn',
          size: '8×10"',
          thumbUrl: null,
          qty: 2,
          unitPrice: 4900,
          printCost: 1200,
        },
      ],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(5) },
        { status: 'in_production' as OrderStatus, at: d(4) },
        { status: 'shipped' as OrderStatus, at: d(1) },
        { status: 'delivered' as OrderStatus, at: null },
      ] as OrderTimelineStep[],
      shippingAddress: {
        name: 'Bob Kim',
        line1: '456 Oak Ave',
        line2: 'Apt 2B',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      trackingUrl: 'https://tracking.example.com/DEF456',
      payout: calcPayout(9800, 2400, COMMISSION_PCT),
      createdAt: d(5),
    },
    {
      id: `${tenantId}-ord-003`,
      number: 'ORD-2024-003',
      buyerHandle: 'carol_m',
      buyerEmail: 'carol@example.com',
      status: 'in_production' as OrderStatus,
      subtotal: 24000,
      items: [
        {
          id: 'item-003',
          printOptionId: 'po-24x36',
          title: 'Midnight Forest',
          size: '24×36"',
          thumbUrl: null,
          qty: 1,
          unitPrice: 24000,
          printCost: 7500,
        },
      ],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(2) },
        { status: 'in_production' as OrderStatus, at: d(1) },
        { status: 'shipped' as OrderStatus, at: null },
        { status: 'delivered' as OrderStatus, at: null },
      ] as OrderTimelineStep[],
      shippingAddress: {
        name: 'Carol Martinez',
        line1: '789 Pine Rd',
        line2: null,
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'US',
      },
      trackingUrl: null,
      payout: calcPayout(24000, 7500, COMMISSION_PCT),
      createdAt: d(2),
    },
    {
      id: `${tenantId}-ord-004`,
      number: 'ORD-2024-004',
      buyerHandle: 'dave_p',
      buyerEmail: 'dave@example.com',
      status: 'paid' as OrderStatus,
      subtotal: 5500,
      items: [
        {
          id: 'item-004',
          printOptionId: 'po-5x7',
          title: 'Coastal Fog',
          size: '5×7"',
          thumbUrl: null,
          qty: 1,
          unitPrice: 5500,
          printCost: 900,
        },
      ],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(0) },
        { status: 'in_production' as OrderStatus, at: null },
        { status: 'shipped' as OrderStatus, at: null },
        { status: 'delivered' as OrderStatus, at: null },
      ] as OrderTimelineStep[],
      shippingAddress: {
        name: 'Dave Patel',
        line1: '321 Elm St',
        line2: null,
        city: 'Seattle',
        state: 'WA',
        zip: '98101',
        country: 'US',
      },
      trackingUrl: null,
      payout: calcPayout(5500, 900, COMMISSION_PCT),
      createdAt: d(0),
    },
    {
      id: `${tenantId}-ord-005`,
      number: 'ORD-2024-005',
      buyerHandle: 'eve_t',
      buyerEmail: 'eve@example.com',
      status: 'refunded' as OrderStatus,
      subtotal: 12000,
      items: [
        {
          id: 'item-005',
          printOptionId: 'po-12x16',
          title: 'Storm Over Plains',
          size: '12×16"',
          thumbUrl: null,
          qty: 1,
          unitPrice: 12000,
          printCost: 3000,
        },
      ],
      timeline: [
        { status: 'paid' as OrderStatus, at: d(20) },
        { status: 'in_production' as OrderStatus, at: d(18) },
        { status: 'refunded' as OrderStatus, at: d(15) },
      ] as OrderTimelineStep[],
      shippingAddress: null,
      trackingUrl: null,
      payout: calcPayout(12000, 3000, COMMISSION_PCT),
      createdAt: d(20),
    },
  ];
}

function calcPayout(subtotal: number, printCost: number, commissionPct: number) {
  const commission = Math.round((subtotal - printCost) * (commissionPct / 100));
  return {
    subtotal,
    printCost,
    commission,
    commissionPct,
    amount: subtotal - printCost - commission,
  };
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

  // Cursor-based pagination (stub: just return first 25)
  const limit = 25;
  const page = orders.slice(0, limit);

  res.json({ data: page, error: null });
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
    res.status(409).json({
      data: null,
      error: { code: 'ALREADY_REFUNDED', message: 'Order is already refunded' },
    });
    return;
  }

  const refundedAt = new Date().toISOString();
  const updatedOrder: OrderV2 = {
    ...order,
    status: 'refunded',
    timeline: [
      ...order.timeline,
      { status: 'refunded' as OrderStatus, at: refundedAt },
    ],
  };

  res.json({ data: updatedOrder, error: null });
}));
