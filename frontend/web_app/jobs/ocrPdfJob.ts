import { getStorageStatus } from "@/lib/server/storage";
import { getDatabaseStatus } from "@/lib/server/db/client";
import type { JobContext, JobResult } from "./types";

export async function ocrPdfJob(context: JobContext): Promise<JobResult> {
  return {
    job: "ocr_pdf",
    status: "planned",
    message: "Run OCR in a long-running worker such as Render, Railway or Fly.io. Vercel Cron should trigger, not execute, heavy OCR.",
    metrics: {
      limit: context.limit ?? 0,
      storageConfigured: getStorageStatus().configured,
      databaseConfigured: getDatabaseStatus().configured,
    },
  };
}
