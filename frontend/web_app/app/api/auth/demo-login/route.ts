import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.APP_ENV === "production" || process.env.APP_DEMO_MODE !== "true") {
    return NextResponse.json(
      { ok: false, error: "Demo login is disabled. Configure production auth provider such as Supabase Auth." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const expectedEmail = process.env.APP_DEMO_USER_EMAIL || "demo@example.com";
  const expectedPassword = process.env.APP_DEMO_USER_PASSWORD || "demo123456";

  if (body.email === expectedEmail && body.password === expectedPassword) {
    return NextResponse.json({
      ok: true,
      demoOnly: true,
      user: {
        email: expectedEmail,
        name: "Lumi Demo User",
      },
    });
  }

  return NextResponse.json({ ok: false, error: "Invalid demo credentials" }, { status: 401 });
}
