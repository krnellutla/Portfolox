import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// ─── helpers ────────────────────────────────────────────────────────────────

async function positions(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  parentId: string | null,
): Promise<number[]> {
  const rows = await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      `SELECT position FROM nodes
       WHERE tenant_id = $1 AND parent_id IS NOT DISTINCT FROM $2
       ORDER BY position`,
      [tenantId, parentId],
    ),
  );
  return rows.rows.map((r) => r.position as number);
}

async function nodeIds(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  parentId: string | null,
): Promise<string[]> {
  const rows = await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      `SELECT id FROM nodes
       WHERE tenant_id = $1 AND parent_id IS NOT DISTINCT FROM $2
       ORDER BY position`,
      [tenantId, parentId],
    ),
  );
  return rows.rows.map((r) => r.id as string);
}

// ─── fixture setup ──────────────────────────────────────────────────────────

describe('nodes write API', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const hostA = `nw-a-${randomUUID()}.example.com`;
  const hostB = `nw-b-${randomUUID()}.example.com`;

  let tokenA: string;
  let tokenB: string;

  // IDs created fresh in beforeEach to keep tests independent
  let folderA: string;
  let folderB: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'NW Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'nwa@example.com', 'NW A'],
      );
    });
    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'NW Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userB, tenantB, 'nwb@example.com', 'NW B'],
      );
    });
    tokenA = await signAccessToken({ sub: userA, tenantId: tenantA, email: 'nwa@example.com' });
    tokenB = await signAccessToken({ sub: userB, tenantId: tenantB, email: 'nwb@example.com' });
  });

  beforeEach(async () => {
    // FORCE RLS means direct pool.query without withTenant would be a no-op
    // (current_tenant_id() returns NULL → no rows match). Use withTenant for cleanup.
    await Promise.all([
      withTenant(migratorPool, tenantA, (client) =>
        client.query('DELETE FROM nodes WHERE tenant_id = $1', [tenantA]),
      ),
      withTenant(migratorPool, tenantB, (client) =>
        client.query('DELETE FROM nodes WHERE tenant_id = $1', [tenantB]),
      ),
    ]);

    folderA = randomUUID();
    folderB = randomUUID();
    await withTenant(migratorPool, tenantA, (client) =>
      client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'folder', 'Root A', 'root-a', 0)",
        [folderA, tenantA],
      ),
    );
    await withTenant(migratorPool, tenantB, (client) =>
      client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'folder', 'Root B', 'root-b', 0)",
        [folderB, tenantB],
      ),
    );
  });

  afterAll(async () => {
    await Promise.all([
      withTenant(migratorPool, tenantA, async (client) => {
        await client.query('DELETE FROM nodes WHERE tenant_id = $1', [tenantA]);
        await client.query('DELETE FROM users WHERE tenant_id = $1', [tenantA]);
        await client.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantA]);
        await client.query('DELETE FROM tenants WHERE id = $1', [tenantA]);
      }),
      withTenant(migratorPool, tenantB, async (client) => {
        await client.query('DELETE FROM nodes WHERE tenant_id = $1', [tenantB]);
        await client.query('DELETE FROM users WHERE tenant_id = $1', [tenantB]);
        await client.query('DELETE FROM tenant_domains WHERE tenant_id = $1', [tenantB]);
        await client.query('DELETE FROM tenants WHERE id = $1', [tenantB]);
      }),
    ]);
    await pool.end();
    await migratorPool.end();
  });

  // ── POST /nodes ─────────────────────────────────────────────────────────

  describe('POST /nodes', () => {
    it('creates a root gallery, auto-derives slug from name', async () => {
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'My Landscapes' });

      expect(res.status).toBe(201);
      expect(res.body.error).toBeNull();
      expect(res.body.data.slug).toBe('my-landscapes');
      expect(res.body.data.type).toBe('gallery');
      expect(res.body.data.parentId).toBeNull();
    });

    it('assigns dense positions to successive root nodes (0, 1, 2)', async () => {
      for (const name of ['Alpha', 'Beta', 'Gamma']) {
        await request(app)
          .post('/nodes')
          .set('Host', hostA)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ type: 'gallery', name });
      }
      const pos = await positions(migratorPool, tenantA, null);
      expect(pos).toEqual([0, 1, 2, 3]); // folderA (pos 0) + 3 new ones
    });

    it('accepts an explicit slug override', async () => {
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'My Gallery', slug: 'custom-slug' });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('custom-slug');
    });

    it('creates a child node under a folder parent', async () => {
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Child Gallery', parentId: folderA });

      expect(res.status).toBe(201);
      expect(res.body.data.parentId).toBe(folderA);
      expect(res.body.data.position).toBe(0);
    });

    it('returns 409 for duplicate slug within same parent', async () => {
      await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Dupe', slug: 'dupe-slug' });

      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Dupe 2', slug: 'dupe-slug' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 409 for duplicate slug at root (proves partial unique index)', async () => {
      // root-a is already used by folderA
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Another Root A', slug: 'root-a' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 404 when parentId belongs to another tenant', async () => {
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Test', parentId: folderB });

      expect(res.status).toBe(404);
    });

    it('returns 422 for invalid body (missing type)', async () => {
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'No Type' });

      expect(res.status).toBe(422);
    });

    it('returns 401 without a Bearer token', async () => {
      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .send({ type: 'gallery', name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('returns 422 when parentId is not a folder type', async () => {
      // Create a gallery node first
      const galleryRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'A Gallery' });
      const galleryId = galleryRes.body.data.id as string;

      const res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Child of Gallery', parentId: galleryId });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── PATCH /nodes/:id ─────────────────────────────────────────────────────

  describe('PATCH /nodes/:id', () => {
    it('renames a node', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Renamed Folder' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Folder');
      expect(res.body.data.slug).toBe('root-a'); // slug unchanged
    });

    it('updates only the slug without touching name', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ slug: 'new-slug' });

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('new-slug');
      expect(res.body.data.name).toBe('Root A');
    });

    it('returns 409 on slug collision', async () => {
      // Create a sibling with a known slug
      await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Sibling', slug: 'sibling-slug' });

      const res = await request(app)
        .patch(`/nodes/${folderA}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ slug: 'sibling-slug' });

      expect(res.status).toBe(409);
    });

    it('returns 404 for unknown node', async () => {
      const res = await request(app)
        .patch(`/nodes/${randomUUID()}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('returns 404 when node belongs to another tenant', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderB}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Stolen' });

      expect(res.status).toBe(404);
    });

    it('returns 422 for empty body (no name or slug)', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('returns 401 without a Bearer token', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}`)
        .set('Host', hostA)
        .send({ name: 'Sneaky' });

      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /nodes/:id ────────────────────────────────────────────────────

  describe('DELETE /nodes/:id', () => {
    it('deletes a node and returns its id', async () => {
      const createRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'To Delete' });
      const id = createRes.body.data.id as string;

      const res = await request(app)
        .delete(`/nodes/${id}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);

      const check = await withTenant(migratorPool, tenantA, (client) =>
        client.query('SELECT id FROM nodes WHERE id=$1', [id]),
      );
      expect(check.rowCount).toBe(0);
    });

    it('compacts sibling positions after deletion (middle of 3)', async () => {
      // Create three root siblings
      const ids: string[] = [];
      for (const name of ['First', 'Second', 'Third']) {
        const r = await request(app)
          .post('/nodes')
          .set('Host', hostA)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ type: 'gallery', name });
        ids.push(r.body.data.id as string);
      }

      // Delete middle one
      await request(app)
        .delete(`/nodes/${ids[1]}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`);

      // Remaining siblings should be dense: [0, 1, 2] (folderA + First + Third)
      const pos = await positions(migratorPool, tenantA, null);
      expect(pos).toEqual([0, 1, 2]);
    });

    it('cascades: deleting a folder removes its children', async () => {
      const childRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Child', parentId: folderA });
      const childId = childRes.body.data.id as string;

      await request(app)
        .delete(`/nodes/${folderA}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`);

      const check = await withTenant(migratorPool, tenantA, (client) =>
        client.query('SELECT id FROM nodes WHERE id=$1', [childId]),
      );
      expect(check.rowCount).toBe(0);
    });

    it('returns 404 for unknown node', async () => {
      const res = await request(app)
        .delete(`/nodes/${randomUUID()}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it('returns 404 when node belongs to another tenant', async () => {
      const res = await request(app)
        .delete(`/nodes/${folderB}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 without a Bearer token', async () => {
      const res = await request(app)
        .delete(`/nodes/${folderA}`)
        .set('Host', hostA);

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /nodes/:id/move ────────────────────────────────────────────────

  describe('PATCH /nodes/:id/move', () => {
    it('reorders within same parent: move first to last', async () => {
      // Create 3 children under folderA
      const ids: string[] = [];
      for (const name of ['Alpha', 'Beta', 'Gamma']) {
        const r = await request(app)
          .post('/nodes')
          .set('Host', hostA)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ type: 'gallery', name, parentId: folderA });
        ids.push(r.body.data.id as string);
      }
      // ids[0]=Alpha(pos0), ids[1]=Beta(pos1), ids[2]=Gamma(pos2)

      const res = await request(app)
        .patch(`/nodes/${ids[0]}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: folderA, position: 2 });

      expect(res.status).toBe(200);
      const orderedIds = await nodeIds(migratorPool, tenantA, folderA);
      expect(orderedIds).toEqual([ids[1], ids[2], ids[0]]); // Beta, Gamma, Alpha
      // Dense positions
      const pos = await positions(migratorPool, tenantA, folderA);
      expect(pos).toEqual([0, 1, 2]);
    });

    it('reorders within same parent: move last to first', async () => {
      const ids: string[] = [];
      for (const name of ['A', 'B', 'C']) {
        const r = await request(app)
          .post('/nodes')
          .set('Host', hostA)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ type: 'gallery', name, parentId: folderA });
        ids.push(r.body.data.id as string);
      }

      await request(app)
        .patch(`/nodes/${ids[2]}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: folderA, position: 0 });

      const orderedIds = await nodeIds(migratorPool, tenantA, folderA);
      expect(orderedIds).toEqual([ids[2], ids[0], ids[1]]);
      expect(await positions(migratorPool, tenantA, folderA)).toEqual([0, 1, 2]);
    });

    it('moves to a new parent folder: source compacts, destination opens', async () => {
      // Create second folder sibling
      const folder2Res = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'folder', name: 'Folder 2' });
      const folder2 = folder2Res.body.data.id as string;

      // Create two children under folderA
      const childRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Child 1', parentId: folderA });
      const child1 = childRes.body.data.id as string;
      await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'Child 2', parentId: folderA });

      // Move child1 to folder2
      const res = await request(app)
        .patch(`/nodes/${child1}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: folder2, position: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.parentId).toBe(folder2);

      // Source group compact
      expect(await positions(migratorPool, tenantA, folderA)).toEqual([0]);
      // Destination group
      expect(await positions(migratorPool, tenantA, folder2)).toEqual([0]);
    });

    it('moves to root (parentId: null)', async () => {
      const childRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'To Root', parentId: folderA });
      const childId = childRes.body.data.id as string;

      const res = await request(app)
        .patch(`/nodes/${childId}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: null, position: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.parentId).toBeNull();
    });

    it('returns 422 for cycle: move a node into its own descendant', async () => {
      const childRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'folder', name: 'Child Folder', parentId: folderA });
      const childId = childRes.body.data.id as string;

      const res = await request(app)
        .patch(`/nodes/${folderA}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: childId, position: 0 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 422 for self-move (parentId === own id)', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: folderA, position: 0 });

      expect(res.status).toBe(422);
    });

    it('returns 422 when moving under a non-folder parent', async () => {
      const galleryRes = await request(app)
        .post('/nodes')
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'gallery', name: 'A Gallery' });
      const galleryId = galleryRes.body.data.id as string;

      const res = await request(app)
        .patch(`/nodes/${folderA}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: galleryId, position: 0 });

      expect(res.status).toBe(422);
    });

    it('returns 404 when target parent belongs to another tenant', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: folderB, position: 0 });

      expect(res.status).toBe(404);
    });

    it('returns 404 for unknown node', async () => {
      const res = await request(app)
        .patch(`/nodes/${randomUUID()}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: null, position: 0 });

      expect(res.status).toBe(404);
    });

    it('returns 401 without a Bearer token', async () => {
      const res = await request(app)
        .patch(`/nodes/${folderA}/move`)
        .set('Host', hostA)
        .send({ parentId: null, position: 0 });

      expect(res.status).toBe(401);
    });

    it('group positions are always dense after any move', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 4; i++) {
        const r = await request(app)
          .post('/nodes')
          .set('Host', hostA)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ type: 'gallery', name: `Node ${i}`, parentId: folderA });
        ids.push(r.body.data.id as string);
      }

      // Move id[3] to position 1
      await request(app)
        .patch(`/nodes/${ids[3]}/move`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ parentId: folderA, position: 1 });

      const pos = await positions(migratorPool, tenantA, folderA);
      expect(pos).toEqual([0, 1, 2, 3]);
    });
  });

  // ── tenant isolation sweep ───────────────────────────────────────────────

  describe('tenant isolation', () => {
    it('create: tenantB nodes invisible to tenantA reads', async () => {
      await request(app)
        .post('/nodes')
        .set('Host', hostB)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ type: 'gallery', name: 'Secret B Gallery' });

      const nodesA = await withTenant(migratorPool, tenantA, (c) =>
        c.query('SELECT id FROM nodes WHERE name=$1', ['Secret B Gallery']),
      );
      expect(nodesA.rowCount).toBe(0);
    });

    it('delete on tenantA nodes does not change tenantB positions', async () => {
      const bPosBefore = await positions(migratorPool, tenantB, null);

      await request(app)
        .delete(`/nodes/${folderA}`)
        .set('Host', hostA)
        .set('Authorization', `Bearer ${tokenA}`);

      const bPosAfter = await positions(migratorPool, tenantB, null);
      expect(bPosAfter).toEqual(bPosBefore);
    });
  });
});
