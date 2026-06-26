export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
  expiresAt: Date;
}

export interface PutObjectParams {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

export interface StorageProvider {
  presignUpload(params: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn: number;
  }): Promise<PresignedUploadResult>;

  deleteObject(key: string): Promise<void>;

  getPublicUrl(key: string): string;

  getObject(key: string): Promise<Buffer>;

  putObject(params: PutObjectParams): Promise<void>;
}
