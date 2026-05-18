export interface StorageObjectInfo {
  key: string;
  sizeBytes?: number;
  updatedAt?: string;
  contentType?: string;
}

export interface UploadObjectInput {
  key: string;
  body: BodyInit | Buffer | Uint8Array | string;
  contentType?: string;
}

export interface StorageDriver {
  provider: string;
  uploadObject(input: UploadObjectInput): Promise<StorageObjectInfo>;
  getObjectUrl(key: string): Promise<string>;
  listObjects(prefix?: string): Promise<StorageObjectInfo[]>;
  deleteObject(key: string): Promise<void>;
}

export interface StorageStatus {
  provider: string;
  configured: boolean;
  bucket?: string;
  mode: "local" | "cloud" | "planned";
  message: string;
}
