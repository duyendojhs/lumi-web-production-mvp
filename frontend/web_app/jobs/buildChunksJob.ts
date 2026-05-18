import { getDatabaseStatus } from "@/lib/server/db/client";
import type { JobContext, JobResult } from "./types";

export async function buildChunksJob(context: JobContext): Promise<JobResult> {
  return {
    job: "build_chunks",
    status: getDatabaseStatus().configured ? "planned" : "failed",
    message: context.dryRun ? "Dry run. Chunk builder would read processed text and write document_chunks." : "Chunk builder interface ready for worker implementation.",
    metrics: { databaseConfigured: getDatabaseStatus().configured },
  };
}
