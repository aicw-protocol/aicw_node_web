export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: { minVersion: "TLSv1.2" };
}

function parseDatabaseUrl(url: string): DatabaseConfig {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: parsed.searchParams.get("ssl") === "true"
      ? { minVersion: "TLSv1.2" as const }
      : undefined,
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return parseDatabaseUrl(url);
  }

  const host = process.env.DATABASE_HOST?.trim();
  const user = process.env.DATABASE_USER?.trim();
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME?.trim();

  if (!host || !user || password === undefined || !database) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL or DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, and DATABASE_NAME.",
    );
  }

  const sslFlag = process.env.DATABASE_SSL?.trim().toLowerCase();
  const ssl = sslFlag === "false" ? undefined : { minVersion: "TLSv1.2" as const };

  return {
    host,
    port: Number(process.env.DATABASE_PORT || 4000),
    user,
    password,
    database,
    ssl,
  };
}

export function isDatabaseConfigured(): boolean {
  if (process.env.DATABASE_URL?.trim()) return true;
  return Boolean(
    process.env.DATABASE_HOST?.trim() &&
      process.env.DATABASE_USER?.trim() &&
      process.env.DATABASE_PASSWORD !== undefined &&
      process.env.DATABASE_NAME?.trim(),
  );
}
