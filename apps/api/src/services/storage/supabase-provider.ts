import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PresignedUploadResult, PutObjectParams, StorageProvider } from './provider.js';

interface SupabaseProviderConfig {
  supabaseUrl: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly supabaseUrl: string;

  constructor(config: SupabaseProviderConfig) {
    this.bucket = config.bucket;
    this.supabaseUrl = config.supabaseUrl.replace(/\/$/, '');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `${this.supabaseUrl}/storage/v1/s3`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async presignUpload(params: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn: number;
  }): Promise<PresignedUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: params.expiresIn,
    });

    return {
      uploadUrl,
      objectKey: params.key,
      expiresAt: new Date(Date.now() + params.expiresIn * 1000),
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${key}`;
  }

  async getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw Object.assign(new Error(`Empty body for key: ${key}`), { code: 'NOT_FOUND' });
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async putObject(params: PutObjectParams): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    });
    await this.client.send(command);
  }

  getTransformUrl(key: string, width: number, quality = 80): string {
    return `${this.supabaseUrl}/storage/v1/render/image/public/${this.bucket}/${key}?width=${width}&quality=${quality}&format=webp`;
  }
}
