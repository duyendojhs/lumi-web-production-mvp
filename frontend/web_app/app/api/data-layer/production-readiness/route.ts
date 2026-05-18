import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { getDataLayerProductionReadiness } from "@/lib/server/dataLayerRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    return NextResponse.json(getDataLayerProductionReadiness());
  } catch (error) {
    return NextResponse.json({ error: "DATA_LAYER_PRODUCTION_READINESS_ERROR", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
