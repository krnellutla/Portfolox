export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
  expiresAt: Date;
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
}
