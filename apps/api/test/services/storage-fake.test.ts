import { describe, expect, it, beforeEach } from 'vitest';
import { FakeStorageProvider } from '../../src/services/storage/index.js';

describe('FakeStorageProvider', () => {
  let storage: FakeStorageProvider;

  beforeEach(() => {
    storage = new FakeStorageProvider();
  });

  it('putObject then getObject round-trips the buffer', async () => {
    const body = Buffer.from('hello world');
    await storage.putObject({ key: 'test/key.webp', body, contentType: 'image/webp' });
    const result = await storage.getObject('test/key.webp');
    expect(result).toEqual(body);
  });

  it('getObject throws for a missing key', async () => {
    await expect(storage.getObject('nonexistent/key')).rejects.toThrow('not found');
  });

  it('seed then getObject returns the seeded buffer', async () => {
    const body = Buffer.from([1, 2, 3]);
    storage.seed('seeded/key', body, 'image/jpeg');
    const result = await storage.getObject('seeded/key');
    expect(result).toEqual(body);
  });

  it('reset clears all stored objects', async () => {
    await storage.putObject({ key: 'a', body: Buffer.from('a'), contentType: 'image/webp' });
    storage.reset();
    await expect(storage.getObject('a')).rejects.toThrow();
  });

  it('reset clears presigned and deleted arrays', async () => {
    await storage.presignUpload({ key: 'k', contentType: 'image/jpeg', contentLength: 100, expiresIn: 60 });
    await storage.deleteObject('k');
    storage.reset();
    expect(storage.presigned).toHaveLength(0);
    expect(storage.deleted).toHaveLength(0);
  });
});
