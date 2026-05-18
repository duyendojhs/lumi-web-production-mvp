import { createLocalStorageDriver } from "./localStorageDriver";
import { createS3StorageDriver, getS3StorageConfigured } from "./s3StorageDriver";
import { createSupabaseStorageDriver, getSupabaseStorageConfigured } from "./supabaseStorageDriver";
import type { StorageDriver, StorageStatus } from "./types";

export function getStorageDriver(): StorageDriver {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  if (provider === "supabase") return createSupabaseStorageDriver();
  if (provider === "s3" || provider === "r2") return createS3StorageDriver();
  return createLocalStorageDriver();
}

export function getStorageStatus(): StorageStatus {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  if (provider === "supabase") {
    return {
      provider,
      configured: getSupabaseStorageConfigured(),
      bucket: process.env.STORAGE_BUCKET,
      mode: "cloud",
      message: getSupabaseStorageConfigured() ? "Supabase Storage configured" : "Missing Supabase URL/service role/bucket",
    };
  }
  if (provider === "s3" || provider === "r2") {
    return {
      provider,
      configured: getS3StorageConfigured(),
      bucket: process.env.S3_BUCKET,
      mode: "cloud",
      message: getS3StorageConfigured() ? "S3/R2 storage configured" : "Missing S3/R2 endpoint, keys, region, or bucket",
    };
  }
  return {
    provider: "local",
    configured: true,
    mode: "local",
    message: "Local storage driver is for development only",
  };
}

export type { StorageDriver, StorageObjectInfo, StorageStatus, UploadObjectInput } from "./types";
