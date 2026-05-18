import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { integrationFlow, platformCards, releaseNotes } from "@/lib/mock/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  return NextResponse.json({
    status: "ok",
    module: "platforms",
    data: {
      platformCards,
      integrationFlow,
      releaseNotes,
    },
  });
}
