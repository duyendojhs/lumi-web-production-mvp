import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { retrieveRagContext, toPublicRagPayload } from "@/lib/server/rag/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 8);
    const result = await retrieveRagContext(q, { limit: Number.isFinite(limit) ? limit : 8 });
    return NextResponse.json(toPublicRagPayload(result));
  } catch (error) {
    return NextResponse.json(
      { error: "DATA_LAYER_RAG_SEARCH_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
