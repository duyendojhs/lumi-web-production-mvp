import { getDatabaseStatus } from "@/lib/server/db/client";
import type { JobContext, JobResult } from "./types";

export async function buildRagIndexJob(context: JobContext): Promise<JobResult> {
  const provider = process.env.VECTOR_PROVIDER ?? "pgvector";
  return {
    job: "build_rag_index",
    status: getDatabaseStatus().configured ? "planned" : "failed",
    message: context.dryRun ? "Dry run. Production path uses pgvector or Qdrant Cloud." : "RAG index job interface ready.",
    metrics: { databaseConfigured: getDatabaseStatus().configured, vectorProvider: provider },
  };
}
