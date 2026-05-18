import { NextResponse } from "next/server";
import { getAuthRuntimeStatus } from "@/lib/auth/provider";
import { getCurrentUser } from "@/lib/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    authenticated: Boolean(user),
    user,
    auth: getAuthRuntimeStatus(),
  });
}
