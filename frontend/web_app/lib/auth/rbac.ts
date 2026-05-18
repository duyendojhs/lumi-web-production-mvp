export type Role = "user" | "admin";

export type Permission =
  | "view_dashboard"
  | "run_pipeline"
  | "view_catalog"
  | "export_metadata"
  | "manage_connectors"
  | "manage_governance"
  | "view_quality"
  | "view_features";

export const rolePermissions: Record<Role, Permission[]> = {
  admin: ["view_dashboard", "run_pipeline", "view_catalog", "export_metadata", "manage_connectors", "manage_governance", "view_quality", "view_features"],
  user: [],
};

export const demoCurrentRole: Role = process.env.APP_ENV !== "production" && process.env.APP_DEMO_MODE === "true" ? "admin" : "user";

export function normalizeRole(value: unknown): Role {
  return value === "admin" ? "admin" : "user";
}

export function can(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function rbacMatrix() {
  return (Object.keys(rolePermissions) as Role[]).map((role) => ({
    role,
    permissions: rolePermissions[role],
  }));
}
