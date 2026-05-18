import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/auth/session";
import { getDataLayerExpectations } from "@/lib/server/dataLayerRepository";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    return NextResponse.json(getDataLayerExpectations());
  } catch (error) {
    return NextResponse.json({ error: "DATA_LAYER_EXPECTATIONS_ERROR", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
