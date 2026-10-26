import { env } from '../../config/env.js';
import { FakeStorageProvider } from './fake-provider.js';
import type { StorageProvider } from './provider.js';
import { S3StorageProvider } from './s3-provider.js';
import { SupabaseStorageProvider } from './supabase-provider.js';

export type { StorageProvider } from './provider.js';
export { FakeStorageProvider } from './fake-provider.js';
export { S3StorageProvider } from './s3-provider.js';
export { SupabaseStorageProvider } from './supabase-provider.js';

export function createStorageProvider(): StorageProvider {
  if (env.STORAGE_PROVIDER === 's3') {
    return new S3StorageProvider({
      bucket: env.STORAGE_BUCKET!,
      region: env.STORAGE_REGION!,
      endpoint: env.STORAGE_ENDPOINT,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL!,
    });
  }

  if (env.STORAGE_PROVIDER === 'supabase') {
    return new SupabaseStorageProvider({
      supabaseUrl: env.SUPABASE_URL!,
      bucket: env.STORAGE_BUCKET!,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
    });
  }

  return new FakeStorageProvider();
}
