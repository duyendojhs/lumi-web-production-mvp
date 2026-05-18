import type { StorageDriver } from "./types";

function s3Config() {
  return {
    endpoint: process.env.S3_ENDPOINT ?? "",
    region: process.env.S3_REGION ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.S3_BUCKET ?? "",
  };
}

export function createS3StorageDriver(): StorageDriver {
  return {
    provider: "s3",
    async uploadObject() {
      throw new Error("S3_DRIVER_REQUIRES_AWS_SDK_OR_PRESIGNED_UPLOAD");
    },
    async getObjectUrl(key: string) {
      const { endpoint, bucket } = s3Config();
      if (!endpoint || !bucket) throw new Error("S3_STORAGE_NOT_CONFIGURED");
      return `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURIComponent(key)}`;
    },
    async listObjects() {
      throw new Error("S3_DRIVER_REQUIRES_AWS_SDK_OR_STORAGE_GATEWAY");
    },
    async deleteObject() {
      throw new Error("S3_DRIVER_REQUIRES_AWS_SDK_OR_STORAGE_GATEWAY");
    },
  };
}

export function getS3StorageConfigured() {
  const config = s3Config();
  return Boolean(config.endpoint && config.region && config.accessKeyId && config.secretAccessKey && config.bucket);
}
