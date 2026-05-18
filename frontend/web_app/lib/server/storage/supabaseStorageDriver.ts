import type { StorageDriver, StorageObjectInfo, UploadObjectInput } from "./types";

function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    bucket: process.env.STORAGE_BUCKET ?? "lumi-data",
  };
}

function ensureSupabaseStorage() {
  const config = supabaseConfig();
  if (!config.url || !config.serviceKey || !config.bucket) {
    throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  }
  return config;
}

function headers(contentType?: string) {
  const { serviceKey } = ensureSupabaseStorage();
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

export function createSupabaseStorageDriver(): StorageDriver {
  return {
    provider: "supabase",
    async uploadObject(input: UploadObjectInput) {
      const { url, bucket } = ensureSupabaseStorage();
      const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(input.key)}`, {
        method: "POST",
        headers: { ...headers(input.contentType), "x-upsert": "true" },
        body: input.body as BodyInit,
      });
      if (!response.ok) throw new Error(`SUPABASE_UPLOAD_FAILED:${response.status}`);
      return { key: input.key, contentType: input.contentType };
    },
    async getObjectUrl(key: string) {
      const { url, bucket } = ensureSupabaseStorage();
      return `${url}/storage/v1/object/public/${bucket}/${encodeURIComponent(key)}`;
    },
    async listObjects(prefix = "") {
      const { url, bucket } = ensureSupabaseStorage();
      const response = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: headers("application/json"),
        body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
      });
      if (!response.ok) throw new Error(`SUPABASE_LIST_FAILED:${response.status}`);
      const data = (await response.json()) as Array<{ name: string; metadata?: { size?: number; mimetype?: string }; updated_at?: string }>;
      return data.map((item) => ({
        key: [prefix, item.name].filter(Boolean).join("/"),
        sizeBytes: item.metadata?.size,
        updatedAt: item.updated_at,
        contentType: item.metadata?.mimetype,
      }));
    },
    async deleteObject(key: string) {
      const { url, bucket } = ensureSupabaseStorage();
      const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!response.ok) throw new Error(`SUPABASE_DELETE_FAILED:${response.status}`);
    },
  };
}

export function getSupabaseStorageConfigured() {
  const config = supabaseConfig();
  return Boolean(config.url && config.serviceKey && config.bucket);
}
