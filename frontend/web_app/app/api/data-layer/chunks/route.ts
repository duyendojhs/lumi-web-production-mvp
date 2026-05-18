import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { getDataLayerChunks, parseFilters } from "@/lib/server/dataLayerRepository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    return NextResponse.json(getDataLayerChunks(parseFilters(request.nextUrl.searchParams)));
  } catch (error) {
    return NextResponse.json({ error: "DATA_LAYER_CHUNKS_ERROR", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
