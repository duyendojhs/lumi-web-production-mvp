import { normalizeRole, type Role } from "./rbac";

export interface AuthRuntimeStatus {
  provider: string;
  demoMode: boolean;
  configured: boolean;
  message: string;
}

export interface AuthenticatedUser {
  id: string;
  profileId?: string;
  email: string;
  role: Role;
  displayName?: string;
}

export function getAuthRuntimeStatus(): AuthRuntimeStatus {
  const provider = process.env.AUTH_PROVIDER ?? "supabase";
  const production = process.env.APP_ENV === "production";
  const demoMode = !production && process.env.APP_DEMO_MODE === "true";
  if (demoMode) {
    return {
      provider: "demo",
      demoMode: true,
      configured: true,
      message: "Demo auth enabled for local development only",
    };
  }
  if (provider === "supabase") {
    const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return {
      provider,
      demoMode: false,
      configured,
      message: configured ? "Supabase Auth env configured" : "Missing Supabase URL or anon key",
    };
  }
  return {
    provider,
    demoMode: false,
    configured: false,
    message: "Auth provider interface exists; configure provider adapter before production login",
  };
}

export function roleFromUserMetadata(metadata: Record<string, unknown> | undefined): Role {
  return normalizeRole(metadata?.role);
}
