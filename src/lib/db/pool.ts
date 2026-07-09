import mysql from "mysql2/promise";
import { getDatabaseConfig, isDatabaseConfigured } from "./config";
import { ensureSchema } from "./schema";

let pool: mysql.Pool | null = null;
let poolReady: Promise<mysql.Pool> | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }

  if (pool) {
    return pool;
  }

  if (!poolReady) {
    poolReady = (async () => {
      const config = getDatabaseConfig();
      const nextPool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ...(config.ssl ? { ssl: config.ssl } : {}),
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        timezone: "+00:00",
      });
      await ensureSchema(nextPool);
      pool = nextPool;
      return nextPool;
    })();
  }

  return poolReady;
}
