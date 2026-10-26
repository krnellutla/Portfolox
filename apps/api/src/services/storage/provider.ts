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

  /** Returns a short-lived signed URL for reading an object (default 1 hour). */
  getSignedReadUrl(key: string, expiresIn?: number): Promise<string>;

  getObject(key: string): Promise<Buffer>;

  putObject(params: PutObjectParams): Promise<void>;

  /**
   * Returns an on-demand CDN transform URL for resizing an image to the given width.
   * Optional — only providers that support server-side transforms implement this.
   * When present, the media processor skips Sharp and the API generates synthetic
   * variants from VARIANT_SPECS rather than reading stored rows.
   */
  getTransformUrl?(key: string, width: number, quality?: number): string;
}
