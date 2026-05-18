export interface JobContext {
  triggeredBy: "manual" | "qstash" | "inngest" | "cron" | "worker";
  dryRun?: boolean;
  limit?: number;
  metadata?: Record<string, unknown>;
}

export interface JobResult {
  job: string;
  status: "success" | "skipped" | "failed" | "planned";
  message: string;
  metrics?: Record<string, number | string | boolean>;
}

export type LumiJob = (context: JobContext) => Promise<JobResult>;
