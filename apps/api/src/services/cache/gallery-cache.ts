import { Redis } from 'ioredis';
import { env } from '../../config/env.js';

const GALLERY_TTL_SECONDS = 300; // 5 minutes

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: false,
    });
    // Suppress connection errors — a cache miss is always safe
    _redis.on('error', () => {});
  }
  return _redis;
}

const cacheKey = (tenantId: string, nodeId: string) =>
  `gallery:${tenantId}:${nodeId}`;

export async function getCachedGallery(
  tenantId: string,
  nodeId: string,
): Promise<unknown | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get(cacheKey(tenantId, nodeId));
    if (val) {
      r.incr('cache:hits').catch(() => {});
      return JSON.parse(val) as unknown;
    }
    r.incr('cache:misses').catch(() => {});
    return null;
  } catch {
    return null;
  }
}

export async function getCacheStats(): Promise<{ hits: number; misses: number } | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const [hitsStr, missesStr] = await r.mget('cache:hits', 'cache:misses');
    return {
      hits: parseInt(hitsStr ?? '0', 10) || 0,
      misses: parseInt(missesStr ?? '0', 10) || 0,
    };
  } catch {
    return null;
  }
}

export async function setCachedGallery(
  tenantId: string,
  nodeId: string,
  data: unknown,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(
      cacheKey(tenantId, nodeId),
      JSON.stringify(data),
      'EX',
      GALLERY_TTL_SECONDS,
    );
  } catch {
    // Cache write failures are non-fatal
  }
}

export async function invalidateGallery(
  tenantId: string,
  nodeId: string,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(cacheKey(tenantId, nodeId));
  } catch {
    // Cache invalidation failures are non-fatal
  }
}
