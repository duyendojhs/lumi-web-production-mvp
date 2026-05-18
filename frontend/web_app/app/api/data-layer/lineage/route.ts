import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { getDataLayerLineage } from "@/lib/server/dataLayerRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    return NextResponse.json(getDataLayerLineage());
  } catch (error) {
    return NextResponse.json({ error: "DATA_LAYER_LINEAGE_ERROR", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
