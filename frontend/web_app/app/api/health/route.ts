import { NextResponse } from "next/server";
import { getAuthRuntimeStatus } from "@/lib/auth/provider";
import { getProviderHealth } from "@/lib/server/llm/llm_provider";
import { getDataRawSummary } from "@/lib/server/dataSummary";
import { getRuntimeDeploymentReadiness } from "@/lib/server/dataLayerOutputs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const provider = getProviderHealth();
  const dataRaw = getDataRawSummary();
  const deployment = getRuntimeDeploymentReadiness();
  const auth = getAuthRuntimeStatus();
  const warnings = deployment.rows
    .filter((row) => row.status === "missing")
    .map((row) => `${row.label}: ${row.detail}`);
  return NextResponse.json({
    status: "ok",
    provider: provider.provider,
    model: provider.model,
    hasGeminiKey: provider.hasGeminiKey,
    hasDatabase: deployment.databaseConfigured,
    hasStorage: deployment.storageConfigured,
    hasAuth: deployment.authConfigured,
    hasVector: deployment.vectorConfigured,
    hasJobs: deployment.jobConfigured,
    authProvider: auth.provider,
    dataRawDetected: dataRaw.dataRawDetected,
    mode: deployment.currentMode,
    runtimeMode: deployment.currentMode,
    appEnv: deployment.appEnv,
    warnings,
  });
}
