import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { normalizeRole, type Role } from "@/lib/auth/rbac";
import type { AuthenticatedUser } from "@/lib/auth/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { queryDb } from "@/lib/server/db/client";

interface ProfileRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
}

export interface CurrentUser extends AuthenticatedUser {
  profileId: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseAuthConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const profile = await ensureProfile(data.user);
  return {
    id: data.user.id,
    profileId: profile.id,
    email: profile.email ?? data.user.email ?? "",
    role: normalizeRole(profile.role),
    displayName: profile.display_name ?? data.user.user_metadata?.name ?? data.user.email ?? undefined,
  };
}

export async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "Login required" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "ADMIN_REQUIRED", message: "Admin role required" }, { status: 403 });
  }
  return null;
}

export async function requireAdminPage(nextPath: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (user.role !== "admin") {
    redirect("/?auth=forbidden");
  }
  return user;
}

export function isSupabaseAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function ensureProfile(user: User): Promise<ProfileRow> {
  if (!process.env.DATABASE_URL) {
    return {
      id: user.id,
      auth_user_id: user.id,
      email: user.email ?? null,
      display_name: user.user_metadata?.name ?? null,
      role: "user",
    };
  }

  const rows = await queryDb<ProfileRow>(
    `
      insert into profiles (auth_user_id, email, display_name, role)
      values ($1, $2, $3, $4)
      on conflict (auth_user_id) do update
      set
        email = excluded.email,
        display_name = coalesce(profiles.display_name, excluded.display_name),
        role = case when excluded.role = 'admin' then 'admin' else profiles.role end,
        updated_at = now()
      returning id::text, auth_user_id::text, email, display_name, role
    `,
    [user.id, user.email ?? null, user.user_metadata?.name ?? null, bootstrapRole(user.email)],
  );
  return rows[0] ?? {
    id: user.id,
    auth_user_id: user.id,
    email: user.email ?? null,
    display_name: user.user_metadata?.name ?? null,
    role: "user",
  };
}

function bootstrapRole(email: string | undefined): Role {
  if (!email) return "user";
  const admins = (process.env.AUTH_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase()) ? "admin" : "user";
}

export function isAdminRole(role: Role | null | undefined) {
  return role === "admin";
}
