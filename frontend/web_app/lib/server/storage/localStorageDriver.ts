import fs from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StorageObjectInfo, UploadObjectInput } from "./types";

function localStorageRoot() {
  return path.resolve(process.env.LOCAL_STORAGE_ROOT ?? process.env.DATA_ROOT ?? path.join(process.cwd(), ".lumi-storage"));
}

function resolveKey(key: string) {
  const safeKey = key.replace(/^[/\\]+/, "");
  const target = path.resolve(localStorageRoot(), safeKey);
  if (!target.startsWith(localStorageRoot())) {
    throw new Error("INVALID_STORAGE_KEY");
  }
  return target;
}

export function createLocalStorageDriver(): StorageDriver {
  return {
    provider: "local",
    async uploadObject(input: UploadObjectInput) {
      const target = resolveKey(input.key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const data = typeof input.body === "string" || Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body as Uint8Array);
      await fs.writeFile(target, data);
      const stat = await fs.stat(target);
      return { key: input.key, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString(), contentType: input.contentType };
    },
    async getObjectUrl(key: string) {
      return `local://${resolveKey(key)}`;
    },
    async listObjects(prefix = "") {
      const root = resolveKey(prefix);
      try {
        const rows: StorageObjectInfo[] = [];
        await walk(root, prefix.replace(/\\/g, "/"), rows);
        return rows;
      } catch {
        return [];
      }
    },
    async deleteObject(key: string) {
      await fs.rm(resolveKey(key), { force: true });
    },
  };
}

async function walk(currentPath: string, prefix: string, rows: StorageObjectInfo[]) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const key = [prefix, entry.name].filter(Boolean).join("/").replace(/\\/g, "/");
    if (entry.isDirectory()) {
      await walk(fullPath, key, rows);
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      rows.push({ key, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString() });
    }
  }
}
