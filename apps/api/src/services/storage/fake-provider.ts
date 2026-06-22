import type { PresignedUploadResult, StorageProvider } from './provider.js';

const FAKE_BASE_URL = 'https://fake-storage.example.com';

export class FakeStorageProvider implements StorageProvider {
  readonly presigned: Array<{ key: string; contentType: string; contentLength: number }> = [];
  readonly deleted: string[] = [];

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
  }

  getPublicUrl(key: string): string {
    return `${FAKE_BASE_URL}/${key}`;
  }

  reset(): void {
    this.presigned.length = 0;
    this.deleted.length = 0;
  }
}
