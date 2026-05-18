import { NextRequest, NextResponse } from "next/server";
import { getSourceLibrary } from "@/lib/server/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "");
    const payload = await getSourceLibrary({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      fileType: request.nextUrl.searchParams.get("fileType") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: "SOURCE_LIBRARY_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
