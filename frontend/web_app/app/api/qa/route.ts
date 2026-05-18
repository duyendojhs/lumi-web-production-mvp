import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import * as qa from "@/lib/mock/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  return NextResponse.json({
    status: "ok",
    module: "qa_qc",
    data: qa,
  });
}
