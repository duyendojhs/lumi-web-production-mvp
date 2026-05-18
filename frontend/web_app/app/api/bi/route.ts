import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import {
  biTables,
  executiveKpis,
  operationalKpis,
  questionCategories,
  segmentHeatmap,
  sourceDistribution,
  usageTrend,
} from "@/lib/mock/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  return NextResponse.json({
    status: "ok",
    module: "bi",
    data: {
      operationalKpis,
      executiveKpis,
      usageTrend,
      questionCategories,
      sourceDistribution,
      segmentHeatmap,
      biTables,
    },
  });
}
