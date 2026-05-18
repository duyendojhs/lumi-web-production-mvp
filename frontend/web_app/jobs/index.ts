import { buildChunksJob } from "./buildChunksJob";
import { buildRagIndexJob } from "./buildRagIndexJob";
import { ingestRawJob } from "./ingestRawJob";
import { ocrPdfJob } from "./ocrPdfJob";
import { qualityCheckJob } from "./qualityCheckJob";
import type { JobContext, JobResult, LumiJob } from "./types";

const jobs: Record<string, LumiJob> = {
  ingest_raw: ingestRawJob,
  ocr_pdf: ocrPdfJob,
  build_chunks: buildChunksJob,
  build_rag_index: buildRagIndexJob,
  quality_check: qualityCheckJob,
};

export async function runJob(name: string, context: JobContext): Promise<JobResult> {
  const job = jobs[name];
  if (!job) {
    return { job: name, status: "failed", message: "Unknown job name" };
  }
  return job(context);
}

export type { JobContext, JobResult, LumiJob } from "./types";
