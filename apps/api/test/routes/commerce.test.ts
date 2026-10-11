import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

describe('Commerce routes', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const hostA = `commerce-a-${randomUUID()}.example.com`;
  const hostB = `commerce-b-${randomUUID()}.example.com`;

  const photoId = randomUUID();
  const printOptionId1 = randomUUID();
  const printOptionId2 = randomUUID();
  const shippingMethodId = randomUUID();

  beforeAll(async () => {
    // Seed tenant A
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Commerce Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      // Print options: $2400 (qty 3 open edition) and $1200 (limited edition of 2, 1 sold)
      await client.query(
        `INSERT INTO print_options (id, tenant_id, photo_id, size, kind, framed, price, print_cost, currency, edition_size, edition_sold)
         VALUES ($1, $2, $3, '16 × 20"', 'Archival matte', false, 2400, 800, 'USD', null, 0)`,
        [printOptionId1, tenantA, photoId],
      );
      await client.query(
        `INSERT INTO print_options (id, tenant_id, photo_id, size, kind, framed, price, print_cost, currency, edition_size, edition_sold)
         VALUES ($1, $2, $3, '8 × 10"', 'Archival matte', false, 1200, 400, 'USD', 2, 1)`,
        [printOptionId2, tenantA, photoId],
      );
      await client.query(
        `INSERT INTO shipping_methods (id, tenant_id, label, estimate, price, sort_order)
         VALUES ($1, $2, 'Standard', '5–7 business days', 995, 0)`,
        [shippingMethodId, tenantA],
      );
    });

    // Seed tenant B (separate)
    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Commerce Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM order_items USING orders WHERE order_items.order_id = orders.id AND orders.tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM orders WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM cart_items USING carts WHERE cart_items.cart_id = carts.id AND carts.tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM carts WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM shipping_methods WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM print_options WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  // ── 1. Cart totals ────────────────────────────────────────────────────────

  it('cart totals: subtotal = sum(lineTotal) and itemCount is correct', async () => {
    const sessionToken = randomUUID();

    // Add 3 of option 1 (2400 each = 7200)
    const r1 = await request(app)
      .post('/cart/items')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({ photoId, printOptionId: printOptionId1, qty: 3 });
    expect(r1.status).toBe(201);

    // Add 1 of option 2 (1200 each = 1200)
    const r2 = await request(app)
      .post('/cart/items')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({ photoId, printOptionId: printOptionId2, qty: 1 });
    expect(r2.status).toBe(201);

    const cart = r2.body.data;
    expect(cart.subtotal).toBe(7200 + 1200);
    expect(cart.itemCount).toBe(3 + 1);
    const total = cart.items.reduce((s: number, i: { lineTotal: number }) => s + i.lineTotal, 0);
    expect(cart.subtotal).toBe(total);
  });

  // ── 2. Edition limits ─────────────────────────────────────────────────────

  it('edition limits: qty > remaining returns EDITION_SOLD_OUT', async () => {
    const sessionToken = randomUUID();

    // printOptionId2 has editionSize=2, editionSold=1 → remaining=1
    const res = await request(app)
      .post('/cart/items')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({ photoId, printOptionId: printOptionId2, qty: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EDITION_SOLD_OUT');
  });

  // ── 3. Tenant isolation ────────────────────────────────────────────────────

  it('tenant isolation: cart from tenant A is not accessible via tenant B host', async () => {
    const sessionToken = randomUUID();

    // Create a cart on tenant A
    const ra = await request(app)
      .post('/cart/items')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({ photoId, printOptionId: printOptionId1, qty: 1 });
    expect(ra.status).toBe(201);
    const cartAId = ra.body.data.id;
    expect(cartAId).toBeTruthy();

    // Fetch cart on tenant B with same session token — should get an empty cart (new cart for tenant B)
    const rb = await request(app)
      .get('/cart')
      .set('Host', hostB)
      .set('Cookie', `cart_session=${sessionToken}`);
    expect(rb.status).toBe(200);
    // The cart returned should not be the one from tenant A
    expect(rb.body.data.id).not.toBe(cartAId);
    expect(rb.body.data.items).toHaveLength(0);
  });

  // ── 4. Checkout session ────────────────────────────────────────────────────

  it('checkout session: creates a pending order and returns orderId + clientSecret', async () => {
    const sessionToken = randomUUID();

    // Fill cart
    await request(app)
      .post('/cart/items')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({ photoId, printOptionId: printOptionId1, qty: 1 });

    const checkoutRes = await request(app)
      .post('/checkout/session')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({
        email: 'buyer@example.com',
        shippingAddress: {
          name: 'Jane Buyer',
          line1: '123 Main St',
          city: 'Springfield',
          region: 'IL',
          postcode: '62701',
          country: 'US',
        },
        shippingMethodId,
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.error).toBeNull();
    const { orderId, clientSecret } = checkoutRes.body.data;
    expect(orderId).toBeTruthy();
    expect(clientSecret).toMatch(/^stub_secret_/);

    // Verify order exists with status 'pending'
    const orderRow = await migratorPool.query(
      `SELECT status FROM orders WHERE id = $1`,
      [orderId],
    );
    expect(orderRow.rows[0]).toBeDefined();
    expect((orderRow.rows[0] as { status: string }).status).toBe('pending');
  });

  // ── 5. Webhook: marks order paid ──────────────────────────────────────────

  it('webhook: payment.succeeded marks order paid and appends to timeline', async () => {
    const sessionToken = randomUUID();

    // Fill cart
    await request(app)
      .post('/cart/items')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({ photoId, printOptionId: printOptionId1, qty: 1 });

    const checkoutRes = await request(app)
      .post('/checkout/session')
      .set('Host', hostA)
      .set('Cookie', `cart_session=${sessionToken}`)
      .send({
        email: 'buyer2@example.com',
        shippingAddress: {
          name: 'Bob Buyer',
          line1: '456 Oak Ave',
          city: 'Chicago',
          region: 'IL',
          postcode: '60601',
          country: 'US',
        },
        shippingMethodId,
      });

    expect(checkoutRes.status).toBe(201);
    const { orderId } = checkoutRes.body.data as { orderId: string };

    // Send webhook
    const webhookRes = await request(app)
      .post('/webhooks/payments')
      .set('Host', hostA)
      .set('Content-Type', 'application/json')
      .send({ event: 'payment.succeeded', orderId });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.data.received).toBe(true);

    // Verify order is now 'paid' with timeline entry
    const orderRow = await migratorPool.query(
      `SELECT status, timeline_json FROM orders WHERE id = $1`,
      [orderId],
    );
    const row = orderRow.rows[0] as { status: string; timeline_json: Array<{ status: string }> };
    expect(row.status).toBe('paid');
    expect(Array.isArray(row.timeline_json)).toBe(true);
    expect(row.timeline_json.some((e) => e.status === 'paid')).toBe(true);
  });
});
