/**
 * Demo seed — idempotent on repeated runs.
 *
 * Creates one dev tenant (localhost) with three photographers and
 * ~45 photos across Landscapes, Portraits, Street, Wedding, and Fine Art albums.
 *
 * Run: pnpm --filter @blueflutes/api seed
 * Requires DATABASE_MIGRATION_URL in environment (session pooler, port 5432).
 */
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { withTenant } from '../db/with-tenant.js';

// ─── Fixed IDs (idempotent) ────────────────────────────────────────────────
const DEV_TENANT_ID   = '00000000-0000-0000-0000-000000000001';
const ROOT_NODE_ID    = '00000000-0000-0000-0000-000000000002';
const NID_LANDSCAPES  = '00000000-0000-0000-0000-000000000003';
const NID_PORTRAITS   = '00000000-0000-0000-0000-000000000004';
const NID_STREET      = '00000000-0000-0000-0000-000000000005';
const NID_WEDDING     = '00000000-0000-0000-0000-000000000006';
const NID_FINEART     = '00000000-0000-0000-0000-000000000007';

// ─── Pexels CDN helper ─────────────────────────────────────────────────────
const px = (id: string, w = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// ─── Photo data ────────────────────────────────────────────────────────────
interface Photo {
  id: string;       // uuid-like suffix — we'll prefix with album slug
  pexelsId: string;
  title: string;
  albumNodeId: string;
  position: number;
  status: 'published' | 'draft';
  printPriceCents: number;
}

const LANDSCAPES: Omit<Photo, 'albumNodeId'>[] = [
  { id: 'l01', pexelsId: '1070378',  title: 'Misty Mountain Valley',    position: 0,  status: 'published', printPriceCents: 4500 },
  { id: 'l02', pexelsId: '1769106',  title: 'Golden Coastline',         position: 1,  status: 'published', printPriceCents: 5500 },
  { id: 'l03', pexelsId: '1101201',  title: 'Autumn Forest Path',       position: 2,  status: 'published', printPriceCents: 3800 },
  { id: 'l04', pexelsId: '6640401',  title: 'Snow-capped Peaks',        position: 3,  status: 'published', printPriceCents: 6200 },
  { id: 'l05', pexelsId: '13344256', title: 'Lavender Field Sunset',    position: 4,  status: 'published', printPriceCents: 4200 },
  { id: 'l06', pexelsId: '20208915', title: 'Desert Dunes at Dusk',     position: 5,  status: 'published', printPriceCents: 5800 },
  { id: 'l07', pexelsId: '26311729', title: 'Northern Lake Reflection', position: 6,  status: 'published', printPriceCents: 4800 },
  { id: 'l08', pexelsId: '27289392', title: 'Rolling Green Hills',      position: 7,  status: 'published', printPriceCents: 3600 },
  { id: 'l09', pexelsId: '29202983', title: 'Stormy Ocean Cliffs',      position: 8,  status: 'published', printPriceCents: 5200 },
  { id: 'l10', pexelsId: '38271767', title: 'Pine Forest Fog',          position: 9,  status: 'published', printPriceCents: 4100 },
  { id: 'l11', pexelsId: '10625959', title: 'Glacial River Delta',      position: 10, status: 'draft',     printPriceCents: 4700 },
  { id: 'l12', pexelsId: '37152301', title: 'Volcanic Crater Lake',     position: 11, status: 'published', printPriceCents: 5100 },
];

const PORTRAITS: Omit<Photo, 'albumNodeId'>[] = [
  { id: 'p01', pexelsId: '3979997',  title: 'Natural Light',            position: 0,  status: 'published', printPriceCents: 3500 },
  { id: 'p02', pexelsId: '8100060',  title: 'Golden Hour Glow',         position: 1,  status: 'published', printPriceCents: 4200 },
  { id: 'p03', pexelsId: '10577611', title: 'Studio Black & White',     position: 2,  status: 'published', printPriceCents: 4800 },
  { id: 'p04', pexelsId: '11844304', title: 'Window Light Silhouette',  position: 3,  status: 'published', printPriceCents: 3900 },
  { id: 'p05', pexelsId: '13327309', title: 'Environmental Portrait',   position: 4,  status: 'published', printPriceCents: 3600 },
  { id: 'p06', pexelsId: '15227500', title: 'Candid Laugh',             position: 5,  status: 'published', printPriceCents: 3200 },
  { id: 'p07', pexelsId: '15649980', title: 'Moody Studio',             position: 6,  status: 'published', printPriceCents: 5500 },
  { id: 'p08', pexelsId: '18051189', title: 'Outdoor Close-up',         position: 7,  status: 'draft',     printPriceCents: 3800 },
  { id: 'p09', pexelsId: '34867545', title: 'Soft Backlight',           position: 8,  status: 'published', printPriceCents: 4100 },
  { id: 'p10', pexelsId: '36697251', title: 'Character Study',          position: 9,  status: 'published', printPriceCents: 4600 },
];

const STREET: Omit<Photo, 'albumNodeId'>[] = [
  { id: 's01', pexelsId: '34965583', title: 'Rainy Night Reflections',  position: 0,  status: 'published', printPriceCents: 4200 },
  { id: 's02', pexelsId: '33076681', title: 'Neon Alley',               position: 1,  status: 'published', printPriceCents: 4800 },
  { id: 's03', pexelsId: '27665348', title: 'Commuter Blur',            position: 2,  status: 'published', printPriceCents: 3600 },
  { id: 's04', pexelsId: '33154292', title: 'Market Stall Light',       position: 3,  status: 'published', printPriceCents: 3900 },
  { id: 's05', pexelsId: '40016974', title: 'Morning Mist Alley',       position: 4,  status: 'published', printPriceCents: 4500 },
];

const WEDDING: Omit<Photo, 'albumNodeId'>[] = [
  { id: 'w01', pexelsId: '3990404',  title: 'First Dance',              position: 0,  status: 'published', printPriceCents: 7500 },
  { id: 'w02', pexelsId: '6679832',  title: 'Vow Exchange',             position: 1,  status: 'published', printPriceCents: 8500 },
  { id: 'w03', pexelsId: '11277389', title: 'Bouquet Detail',           position: 2,  status: 'published', printPriceCents: 3800 },
  { id: 'w04', pexelsId: '15291907', title: 'Garden Ceremony',          position: 3,  status: 'published', printPriceCents: 9200 },
  { id: 'w05', pexelsId: '17057198', title: 'Getting Ready',            position: 4,  status: 'published', printPriceCents: 6500 },
  { id: 'w06', pexelsId: '17794569', title: 'Reception Joy',            position: 5,  status: 'published', printPriceCents: 7200 },
  { id: 'w07', pexelsId: '37828118', title: 'Golden Hour Kiss',         position: 6,  status: 'published', printPriceCents: 9800 },
  { id: 'w08', pexelsId: '38845444', title: 'Details & Rings',          position: 7,  status: 'published', printPriceCents: 4500 },
];

const FINEART: Omit<Photo, 'albumNodeId'>[] = [
  { id: 'f01', pexelsId: '20943861', title: 'Abstract Geometry',        position: 0,  status: 'published', printPriceCents: 6800 },
  { id: 'f02', pexelsId: '27583914', title: 'Monochrome Study',         position: 1,  status: 'published', printPriceCents: 7500 },
  { id: 'f03', pexelsId: '39719487', title: 'Light & Shadow',           position: 2,  status: 'published', printPriceCents: 6200 },
  { id: 'f04', pexelsId: '30757600', title: 'Texture Macro',            position: 3,  status: 'published', printPriceCents: 5900 },
  { id: 'f05', pexelsId: '36720270', title: 'Documentary Moment',       position: 4,  status: 'published', printPriceCents: 5500 },
  { id: 'f06', pexelsId: '30133734', title: 'Urban Life',               position: 5,  status: 'draft',     printPriceCents: 5200 },
];

async function main() {
  const ssl = env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: env.DATABASE_MIGRATION_URL, ssl });
  console.log('🌱 Seeding demo data…');

  await withTenant(pool, DEV_TENANT_ID, async (client) => {

    // Tenant + domain
    await client.query(
      `INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [DEV_TENANT_ID, 'Alex Chen Photography'],
    );
    await client.query(
      `INSERT INTO tenant_domains (tenant_id, host, is_primary)
       VALUES ($1, 'localhost', true)
       ON CONFLICT (host) DO NOTHING`,
      [DEV_TENANT_ID],
    );

    // Node tree
    await client.query(
      `INSERT INTO nodes (id, tenant_id, type, name, slug)
       VALUES ($1, $2, 'folder', 'Root', 'root')
       ON CONFLICT (id) DO NOTHING`,
      [ROOT_NODE_ID, DEV_TENANT_ID],
    );
    await client.query(
      `INSERT INTO nodes (id, tenant_id, parent_id, type, name, slug, position)
       VALUES
         ($1, $6, $7, 'gallery', 'Landscapes', 'landscapes', 0),
         ($2, $6, $7, 'gallery', 'Portraits',  'portraits',  1),
         ($3, $6, $7, 'gallery', 'Street',     'street',     2),
         ($4, $6, $7, 'gallery', 'Wedding',    'wedding',    3),
         ($5, $6, $7, 'gallery', 'Fine Art',   'fine-art',   4)
       ON CONFLICT (id) DO NOTHING`,
      [NID_LANDSCAPES, NID_PORTRAITS, NID_STREET, NID_WEDDING, NID_FINEART, DEV_TENANT_ID, ROOT_NODE_ID],
    );

    // Photos — insert as media_assets
    const albums: Array<{ photos: Omit<Photo, 'albumNodeId'>[]; nodeId: string; slug: string }> = [
      { photos: LANDSCAPES, nodeId: NID_LANDSCAPES, slug: 'landscapes' },
      { photos: PORTRAITS,  nodeId: NID_PORTRAITS,  slug: 'portraits'  },
      { photos: STREET,     nodeId: NID_STREET,     slug: 'street'     },
      { photos: WEDDING,    nodeId: NID_WEDDING,    slug: 'wedding'    },
      { photos: FINEART,    nodeId: NID_FINEART,    slug: 'fine-art'   },
    ];

    let totalPhotos = 0;
    for (const album of albums) {
      for (const photo of album.photos) {
        // Use a deterministic UUID-ish id so re-runs are idempotent
        const assetId = `00000000-0000-0000-${album.slug.slice(0, 4).padEnd(4, '0')}-${photo.id.padStart(12, '0')}`;
        await client.query(
          `INSERT INTO media_assets (
             id, tenant_id, url, thumbnail_url, original_filename,
             mime_type, size_bytes, status, node_id
           ) VALUES ($1,$2,$3,$4,$5,'image/jpeg',0,$6,$7)
           ON CONFLICT (id) DO UPDATE SET
             url = EXCLUDED.url,
             thumbnail_url = EXCLUDED.thumbnail_url,
             status = EXCLUDED.status`,
          [
            assetId,
            DEV_TENANT_ID,
            px(photo.pexelsId, 1600),
            px(photo.pexelsId, 400),
            `${photo.title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
            photo.status,
            album.nodeId,
          ],
        );
        totalPhotos++;
      }
    }

    console.log(`  ✓ tenant: ${DEV_TENANT_ID}`);
    console.log(`  ✓ node tree: 5 albums under root`);
    console.log(`  ✓ media_assets: ${totalPhotos} photos`);
  });

  await pool.end();
  console.log('🌱 Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
