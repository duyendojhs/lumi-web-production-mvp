import type { Pool, QueryResultRow } from "pg";
import type { DatabaseStatus } from "./types";

let pool: Pool | null = null;

export function getDatabaseStatus(): DatabaseStatus {
  const configured = Boolean(process.env.DATABASE_URL);
  const production = process.env.APP_ENV === "production";
  if (!configured) {
    return {
      configured: false,
      mode: production ? "production_db" : "local_fallback",
      adapter: "not_configured",
      message: production ? "DATABASE_URL is required for production Data Layer APIs" : "DATABASE_URL not set; using local JSON/file fallback",
    };
  }
  return {
    configured: true,
    mode: "production_db",
    adapter: "postgres",
    message: "DATABASE_URL configured. Postgres repository is ready for live reads.",
  };
}

export function shouldUseProductionDb() {
  return process.env.APP_ENV === "production" && Boolean(process.env.DATABASE_URL);
}

export function productionDbUnavailablePayload(): {
  mode: "production_db";
  configured: boolean;
  adapter: "not_configured" | "postgres";
  warning: string;
  message: string;
} {
  const status = getDatabaseStatus();
  return {
    mode: "production_db",
    configured: status.configured,
    adapter: status.adapter,
    warning: status.configured ? "DATABASE_REPOSITORY_NOT_IMPLEMENTED_FOR_ENDPOINT" : "DATABASE_URL_NOT_CONFIGURED",
    message: status.message,
  };
}

export async function queryDb<T = QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const client = await getPgPool();
  const result = await client.query<QueryResultRow>(text, values);
  return result.rows as T[];
}

async function getPgPool(): Promise<Pool> {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for production database queries");
  }

  const { Pool: PgPool } = await import("pg");
  const ssl = process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };
  pool = new PgPool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl,
  });
  return pool;
}
