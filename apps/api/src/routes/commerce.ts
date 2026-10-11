import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../lib/validate.js';
import { createPaymentProcessor } from '../lib/payment/index.js';
import {
  AddToCartSchema,
  UpdateCartItemSchema,
  CheckoutSessionSchema,
} from '@blueflutes/shared';
import { env } from '../config/env.js';

export const commerceRouter: Router = Router();

const cartWriteLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
});

const CART_COOKIE = 'cart_session';

// ── helpers ────────────────────────────────────────────────────────────────

function setCookieOptions(req: Request) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure,
    sameSite: 'none' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

/** Resolve or create a cart for the current request. Returns cartId and sessionToken. */
async function resolveCart(req: Request): Promise<{ cartId: string; sessionToken: string | null }> {
  if (!req.withTenant) throw AppError.notFound('Tenant not found');

  const userId: string | undefined = (req as Request & { user?: { id: string } }).user?.id;
  const sessionToken: string | null = (req.cookies as Record<string, string>)[CART_COOKIE] ?? null;

  // Look for existing cart
  const existing = await req.withTenant(async (client) => {
    if (userId) {
      const r = await client.query(
        `SELECT id FROM carts WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      return r.rows[0] as { id: string } | undefined;
    }
    if (sessionToken) {
      const r = await client.query(
        `SELECT id FROM carts WHERE session_token = $1 LIMIT 1`,
        [sessionToken],
      );
      return r.rows[0] as { id: string } | undefined;
    }
    return undefined;
  });

  if (existing) return { cartId: existing.id, sessionToken };

  // Create new cart
  const newSessionToken = userId ? null : randomUUID();
  const cartId = await req.withTenant(async (client) => {
    const r = await client.query(
      `INSERT INTO carts (id, tenant_id, user_id, session_token)
       VALUES ($1, current_setting('app.tenant_id')::uuid, $2, $3)
       RETURNING id`,
      [randomUUID(), userId ?? null, newSessionToken],
    );
    return (r.rows[0] as { id: string }).id;
  });

  return { cartId, sessionToken: newSessionToken };
}

/** Build the Cart response payload from a cart row. */
async function buildCartResponse(req: Request, cartId: string, tenantId: string) {
  if (!req.withTenant) throw AppError.notFound('Tenant not found');

  const rows = await req.withTenant(async (client) => {
    const r = await client.query(
      `SELECT
         ci.id, ci.photo_id, ci.print_option_id, ci.qty, ci.unit_price,
         po.size, po.kind,
         ma.original_filename AS title, ma.url AS thumb_url
       FROM cart_items ci
       JOIN print_options po ON po.id = ci.print_option_id
       LEFT JOIN media_assets ma ON ma.id = ci.photo_id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at`,
      [cartId],
    );
    return r.rows as Array<{
      id: string;
      photo_id: string;
      print_option_id: string;
      qty: number;
      unit_price: number;
      size: string;
      kind: string;
      title: string | null;
      thumb_url: string | null;
    }>;
  });

  const items = rows.map((r) => ({
    id: r.id,
    photoId: r.photo_id,
    printOptionId: r.print_option_id,
    title: r.title ?? 'Untitled',
    thumbUrl: r.thumb_url ?? '',
    size: r.size,
    kind: r.kind,
    qty: r.qty,
    unitPrice: r.unit_price,
    lineTotal: r.qty * r.unit_price,
  }));

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return {
    id: cartId,
    photographerId: tenantId,
    items,
    subtotal,
    currency: 'USD',
    itemCount,
  };
}

// ── GET /photos/:id/print-options ──────────────────────────────────────────

commerceRouter.get(
  '/photos/:id/print-options',
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const { id } = req.params;

    const rows = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT id, photo_id, size, kind, framed, price, currency
         FROM print_options WHERE photo_id = $1`,
        [id],
      );
      return r.rows as Array<{
        id: string;
        photo_id: string;
        size: string;
        kind: string;
        framed: boolean;
        price: number;
        currency: string;
      }>;
    });

    const data = rows.map((r) => ({
      id: r.id,
      photoId: r.photo_id,
      size: r.size,
      kind: r.kind,
      framed: r.framed,
      price: r.price,
      currency: r.currency,
    }));

    res.json({ data, error: null });
  }),
);

// ── GET /cart ──────────────────────────────────────────────────────────────

commerceRouter.get(
  '/cart',
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const tenantId = req.tenant?.id;
    if (!tenantId) throw AppError.notFound('Tenant not found');

    const { cartId, sessionToken } = await resolveCart(req);

    if (sessionToken && !(req.cookies as Record<string, string>)[CART_COOKIE]) {
      res.cookie(CART_COOKIE, sessionToken, setCookieOptions(req));
    }

    const cart = await buildCartResponse(req, cartId, tenantId);
    res.json({ data: cart, error: null });
  }),
);

// ── POST /cart/items ───────────────────────────────────────────────────────

commerceRouter.post(
  '/cart/items',
  cartWriteLimit,
  validate({ body: AddToCartSchema }),
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const tenantId = req.tenant?.id;
    if (!tenantId) throw AppError.notFound('Tenant not found');
    const { photoId, printOptionId, qty } = req.body as { photoId: string; printOptionId: string; qty: number };

    // Check edition limits
    const optRow = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT id, price, edition_size, edition_sold FROM print_options WHERE id = $1`,
        [printOptionId],
      );
      return r.rows[0] as { id: string; price: number; edition_size: number | null; edition_sold: number } | undefined;
    });
    if (!optRow) throw AppError.notFound('Print option not found');

    if (optRow.edition_size !== null) {
      const remaining = optRow.edition_size - optRow.edition_sold;
      if (qty > remaining) {
        const err = new AppError('EDITION_SOLD_OUT' as never, 'Edition sold out', 409);
        throw err;
      }
    }

    const { cartId, sessionToken } = await resolveCart(req);

    // Check if item already in cart; if so, update qty
    await req.withTenant(async (client) => {
      const existing = await client.query(
        `SELECT id, qty FROM cart_items WHERE cart_id = $1 AND print_option_id = $2`,
        [cartId, printOptionId],
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0] as { id: string; qty: number };
        await client.query(`UPDATE cart_items SET qty = $1 WHERE id = $2`, [row.qty + qty, row.id]);
      } else {
        await client.query(
          `INSERT INTO cart_items (id, cart_id, photo_id, print_option_id, qty, unit_price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), cartId, photoId, printOptionId, qty, optRow.price],
        );
      }
    });

    if (sessionToken && !(req.cookies as Record<string, string>)[CART_COOKIE]) {
      res.cookie(CART_COOKIE, sessionToken, setCookieOptions(req));
    }

    const cart = await buildCartResponse(req, cartId, tenantId);
    res.status(201).json({ data: cart, error: null });
  }),
);

// ── PATCH /cart/items/:id ──────────────────────────────────────────────────

commerceRouter.patch(
  '/cart/items/:id',
  cartWriteLimit,
  validate({ body: UpdateCartItemSchema }),
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const tenantId = req.tenant?.id;
    if (!tenantId) throw AppError.notFound('Tenant not found');
    const { id } = req.params;
    const { qty } = req.body as { qty: number };

    const { cartId } = await resolveCart(req);

    // Check edition limits before update
    const optRow = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT po.edition_size, po.edition_sold
         FROM cart_items ci JOIN print_options po ON po.id = ci.print_option_id
         WHERE ci.id = $1 AND ci.cart_id = $2`,
        [id, cartId],
      );
      return r.rows[0] as { edition_size: number | null; edition_sold: number } | undefined;
    });
    if (!optRow) throw AppError.notFound('Cart item not found');

    if (optRow.edition_size !== null) {
      const remaining = optRow.edition_size - optRow.edition_sold;
      if (qty > remaining) {
        const err = new AppError('EDITION_SOLD_OUT' as never, 'Edition sold out', 409);
        throw err;
      }
    }

    await req.withTenant(async (client) => {
      await client.query(`UPDATE cart_items SET qty = $1 WHERE id = $2 AND cart_id = $3`, [qty, id, cartId]);
    });

    const cart = await buildCartResponse(req, cartId, tenantId);
    res.json({ data: cart, error: null });
  }),
);

// ── DELETE /cart/items/:id ─────────────────────────────────────────────────

commerceRouter.delete(
  '/cart/items/:id',
  cartWriteLimit,
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const tenantId = req.tenant?.id;
    if (!tenantId) throw AppError.notFound('Tenant not found');
    const { id } = req.params;

    const { cartId } = await resolveCart(req);

    await req.withTenant(async (client) => {
      await client.query(`DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`, [id, cartId]);
    });

    const cart = await buildCartResponse(req, cartId, tenantId);
    res.json({ data: cart, error: null });
  }),
);

// ── GET /checkout/shipping-methods ────────────────────────────────────────

commerceRouter.get(
  '/checkout/shipping-methods',
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');

    const rows = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT id, label, estimate, price FROM shipping_methods ORDER BY sort_order`,
      );
      return r.rows as Array<{ id: string; label: string; estimate: string; price: number }>;
    });

    const data = rows.map((r) => ({
      id: r.id,
      label: r.label,
      estimate: r.estimate,
      price: r.price,
    }));

    res.json({ data, error: null });
  }),
);

// ── POST /checkout/session ─────────────────────────────────────────────────

commerceRouter.post(
  '/checkout/session',
  cartWriteLimit,
  validate({ body: CheckoutSessionSchema }),
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const tenantId = req.tenant?.id;
    if (!tenantId) throw AppError.notFound('Tenant not found');

    const body = req.body as {
      email: string;
      shippingAddress: Record<string, unknown>;
      shippingMethodId: string;
    };

    const { cartId } = await resolveCart(req);

    // Verify cart has items
    const cart = await buildCartResponse(req, cartId, tenantId);
    if (cart.items.length === 0) {
      throw new AppError('CART_EMPTY' as never, 'Cart is empty', 400);
    }

    // Get shipping method
    const shippingRow = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT id, price FROM shipping_methods WHERE id = $1`,
        [body.shippingMethodId],
      );
      return r.rows[0] as { id: string; price: number } | undefined;
    });
    if (!shippingRow) throw AppError.notFound('Shipping method not found');

    const total = cart.subtotal + shippingRow.price;
    const orderNumber = `BF-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderToken = randomUUID();
    const orderId = randomUUID();

    // Create order
    await req.withTenant(async (client) => {
      await client.query(
        `INSERT INTO orders (
          id, number, tenant_id, buyer_email, buyer_name,
          shipping_address_json, shipping_method_id, shipping_price,
          subtotal, tax, total, currency, status, timeline_json, order_token
        ) VALUES ($1,$2,current_setting('app.tenant_id')::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','[]',$12)`,
        [
          orderId,
          orderNumber,
          body.email,
          body.shippingAddress['name'] ?? 'Buyer',
          JSON.stringify(body.shippingAddress),
          body.shippingMethodId,
          shippingRow.price,
          cart.subtotal,
          0, // tax
          total,
          cart.currency,
          orderToken,
        ],
      );

      // Snapshot cart items into order_items
      for (const item of cart.items) {
        await client.query(
          `INSERT INTO order_items (id, order_id, photo_id, print_option_id, title, thumb_url, size, kind, qty, unit_price, print_cost)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            randomUUID(),
            orderId,
            item.photoId,
            item.printOptionId,
            item.title,
            item.thumbUrl,
            item.size,
            item.kind,
            item.qty,
            item.unitPrice,
            0, // print_cost stub
          ],
        );
      }
    });

    // Create payment intent
    const processor = createPaymentProcessor();
    const { clientSecret, paymentIntentId } = await processor.createPaymentIntent({
      amount: total,
      currency: cart.currency,
      orderId,
      buyerEmail: body.email,
    });

    // Store paymentIntentId
    await req.withTenant(async (client) => {
      await client.query(
        `UPDATE orders SET payment_intent_id = $1 WHERE id = $2`,
        [paymentIntentId, orderId],
      );
    });

    res.status(201).json({ data: { orderId, clientSecret, orderToken }, error: null });
  }),
);

// ── GET /orders/:id ────────────────────────────────────────────────────────

commerceRouter.get(
  '/orders/:id',
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const tenantId = req.tenant?.id;
    if (!tenantId) throw AppError.notFound('Tenant not found');
    const { id } = req.params;
    const { token } = req.query as { token?: string };

    const orderRow = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT o.*, sm.label AS sm_label, sm.estimate AS sm_estimate, sm.price AS sm_price
         FROM orders o JOIN shipping_methods sm ON sm.id = o.shipping_method_id
         WHERE o.id = $1`,
        [id],
      );
      return r.rows[0] as Record<string, unknown> | undefined;
    });

    if (!orderRow) throw new AppError('ORDER_NOT_FOUND' as never, 'Order not found', 404);

    // Token check for guest access
    const userId: string | undefined = (req as Request & { user?: { id: string } }).user?.id;
    if (!userId && orderRow['order_token'] !== token) {
      throw new AppError('INVALID_TOKEN' as never, 'Invalid or missing order token', 403);
    }

    const itemRows = await req.withTenant(async (client) => {
      const r = await client.query(
        `SELECT id, photo_id, print_option_id, title, thumb_url, size, kind, qty, unit_price
         FROM order_items WHERE order_id = $1`,
        [id],
      );
      return r.rows as Array<{
        id: string;
        photo_id: string;
        print_option_id: string;
        title: string;
        thumb_url: string;
        size: string;
        kind: string;
        qty: number;
        unit_price: number;
      }>;
    });

    const items = itemRows.map((r) => ({
      id: r.id,
      photoId: r.photo_id,
      printOptionId: r.print_option_id,
      title: r.title,
      thumbUrl: r.thumb_url,
      size: r.size,
      kind: r.kind,
      qty: r.qty,
      unitPrice: r.unit_price,
      lineTotal: r.qty * r.unit_price,
    }));

    const timeline = Array.isArray(orderRow['timeline_json'])
      ? (orderRow['timeline_json'] as Array<{ status: string; at: string }>)
      : [];

    const data = {
      id: orderRow['id'],
      number: orderRow['number'],
      photographerId: tenantId,
      buyer: {
        email: orderRow['buyer_email'],
        name: orderRow['buyer_name'],
      },
      items,
      shippingAddress: orderRow['shipping_address_json'],
      shippingMethod: {
        id: orderRow['shipping_method_id'],
        label: orderRow['sm_label'],
        estimate: orderRow['sm_estimate'],
        price: orderRow['sm_price'],
      },
      subtotal: orderRow['subtotal'],
      shipping: orderRow['shipping_price'],
      tax: orderRow['tax'],
      total: orderRow['total'],
      currency: orderRow['currency'],
      status: orderRow['status'],
      timeline,
      trackingUrl: orderRow['tracking_url'] ?? undefined,
      createdAt: (orderRow['created_at'] as Date).toISOString(),
    };

    res.json({ data, error: null });
  }),
);

// ── POST /webhooks/payments ────────────────────────────────────────────────

commerceRouter.post(
  '/webhooks/payments',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res: Response) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');

    // For the stub processor, accept any JSON payload
    let payload: { orderId?: string; paymentIntentId?: string; event?: string };
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
      payload = JSON.parse(raw) as typeof payload;
    } catch {
      throw AppError.badRequest('Invalid webhook payload');
    }

    if (payload.event !== 'payment.succeeded' || !payload.orderId) {
      res.json({ data: { received: true }, error: null });
      return;
    }

    const now = new Date().toISOString();

    await req.withTenant(async (client) => {
      // Get existing timeline
      const existing = await client.query(
        `SELECT timeline_json FROM orders WHERE id = $1`,
        [payload.orderId],
      );
      if (!existing.rows[0]) return;

      const timeline = Array.isArray((existing.rows[0] as Record<string, unknown>)['timeline_json'])
        ? ((existing.rows[0] as Record<string, unknown>)['timeline_json'] as Array<unknown>)
        : [];

      const newTimeline = [...timeline, { status: 'paid', at: now }];

      await client.query(
        `UPDATE orders SET status = 'paid', timeline_json = $1::jsonb, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify(newTimeline), payload.orderId],
      );
    });

    res.json({ data: { received: true }, error: null });
  }),
);
