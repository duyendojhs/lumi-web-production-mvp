import { getDatabaseStatus } from "@/lib/server/db/client";
import type { JobContext, JobResult } from "./types";

export async function qualityCheckJob(context: JobContext): Promise<JobResult> {
  return {
    job: "quality_check",
    status: getDatabaseStatus().configured ? "planned" : "failed",
    message: context.dryRun ? "Dry run. Quality checks would append data_quality_issues and pipeline_runs." : "Quality check job interface ready.",
    metrics: { databaseConfigured: getDatabaseStatus().configured },
  };
}
