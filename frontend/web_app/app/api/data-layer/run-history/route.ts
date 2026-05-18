import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { getDataLayerRunHistory } from "@/lib/server/dataLayerRepository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    return NextResponse.json(getDataLayerRunHistory(Number.isFinite(limit) ? limit : 20));
  } catch (error) {
    return NextResponse.json({ error: "DATA_LAYER_RUN_HISTORY_ERROR", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
