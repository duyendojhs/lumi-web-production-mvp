import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth/session";
import { retrieveRagContext, toPublicRagPayload } from "@/lib/server/rag/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 6);
    const user = await getCurrentUser();
    const result = await retrieveRagContext(q, { limit: Number.isFinite(limit) ? limit : 6, userId: user?.profileId });
    return NextResponse.json(toPublicRagPayload(result));
  } catch (error) {
    return NextResponse.json(
      { error: "RAG_SEARCH_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { q?: string; query?: string; limit?: number };
    const user = await getCurrentUser();
    const result = await retrieveRagContext(body.q ?? body.query ?? "", { limit: body.limit, userId: user?.profileId });
    return NextResponse.json(toPublicRagPayload(result));
  } catch (error) {
    return NextResponse.json(
      { error: "RAG_SEARCH_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
