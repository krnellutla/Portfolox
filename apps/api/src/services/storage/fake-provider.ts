import type { PresignedUploadResult, PutObjectParams, StorageProvider } from './provider.js';

const FAKE_BASE_URL = 'https://fake-storage.example.com';

interface StoredObject {
  body: Buffer;
  contentType: string;
}

export class FakeStorageProvider implements StorageProvider {
  readonly presigned: Array<{ key: string; contentType: string; contentLength: number }> = [];
  readonly deleted: string[] = [];
  private readonly objects = new Map<string, StoredObject>();

  async presignUpload(params: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn: number;
  }): Promise<PresignedUploadResult> {
    this.presigned.push({
      key: params.key,
      contentType: params.contentType,
      contentLength: params.contentLength,
    });

    return {
      uploadUrl: `${FAKE_BASE_URL}/${params.key}?X-Amz-Expires=${params.expiresIn}`,
      objectKey: params.key,
      expiresAt: new Date(Date.now() + params.expiresIn * 1000),
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.deleted.push(key);
    this.objects.delete(key);
  }

  getPublicUrl(key: string): string {
    return `${FAKE_BASE_URL}/${key}`;
  }

  async getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
    return `${FAKE_BASE_URL}/${key}?X-Amz-Expires=${expiresIn}&X-Amz-Signature=fake`;
  }

  async getObject(key: string): Promise<Buffer> {
    const stored = this.objects.get(key);
    if (!stored) {
      throw Object.assign(new Error(`Object not found: ${key}`), { code: 'NOT_FOUND' });
    }
    return stored.body;
  }

  async putObject(params: PutObjectParams): Promise<void> {
    this.objects.set(params.key, { body: params.body, contentType: params.contentType });
  }

  getTransformUrl(key: string, width: number, quality = 80): string {
    return `${FAKE_BASE_URL}/${key}?width=${width}&quality=${quality}&format=webp`;
  }

  seed(key: string, body: Buffer, contentType: string): void {
    this.objects.set(key, { body, contentType });
  }

  reset(): void {
    this.presigned.length = 0;
    this.deleted.length = 0;
    this.objects.clear();
  }
}
