import { getStorageStatus } from "@/lib/server/storage";
import { getDatabaseStatus } from "@/lib/server/db/client";
import type { JobContext, JobResult } from "./types";

export async function ingestRawJob(context: JobContext): Promise<JobResult> {
  const storage = getStorageStatus();
  const database = getDatabaseStatus();
  if (context.dryRun) {
    return {
      job: "ingest_raw",
      status: "skipped",
      message: "Dry run only. Production ingest reads object storage and writes document metadata to managed Postgres.",
      metrics: { storageConfigured: storage.configured, databaseConfigured: database.configured },
    };
  }
  return {
    job: "ingest_raw",
    status: storage.configured && database.configured ? "planned" : "failed",
    message: storage.configured && database.configured ? "Connector interface ready; attach DB driver/worker runner." : "Storage or DATABASE_URL missing.",
    metrics: { storageConfigured: storage.configured, databaseConfigured: database.configured },
  };
}
