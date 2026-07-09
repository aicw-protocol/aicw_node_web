/**
 * Initialize TiDB / MySQL tables for aicw_node_web.
 * Usage: npm run db:init
 * Requires DATABASE_* or DATABASE_URL in .env.local (loaded via dotenv if present).
 */
import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getConfig() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 4000),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
      ssl: parsed.searchParams.get("ssl") !== "false",
    };
  }

  const host = process.env.DATABASE_HOST?.trim();
  const user = process.env.DATABASE_USER?.trim();
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME?.trim();

  if (!host || !user || password === undefined || !database) {
    throw new Error(
      "Set DATABASE_URL or DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME in .env.local",
    );
  }

  const sslFlag = process.env.DATABASE_SSL?.trim().toLowerCase();
  return {
    host,
    port: Number(process.env.DATABASE_PORT || 4000),
    user,
    password,
    database,
    ssl: sslFlag === "false" ? false : { minVersion: "TLSv1.2" },
  };
}

const NODES_TABLE = `
CREATE TABLE IF NOT EXISTS nodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_wallet VARCHAR(64) NOT NULL,
  node_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('registered', 'inactive') NOT NULL DEFAULT 'registered',
  referral_wallet_opens INT UNSIGNED NOT NULL DEFAULT 0,
  reward_sol DECIMAL(20, 9) NOT NULL DEFAULT 0,
  reward_token DECIMAL(20, 9) NOT NULL DEFAULT 0,
  contract_stake_ref VARCHAR(128) NULL,
  last_ping_at TIMESTAMP NULL,
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nodes_node_id (node_id),
  KEY idx_nodes_owner_wallet (owner_wallet),
  KEY idx_nodes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const STAKING_TABLE = `
CREATE TABLE IF NOT EXISTS staking (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet VARCHAR(64) NOT NULL,
  amount_sol DECIMAL(20, 9) NOT NULL,
  staked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'unstake_requested', 'returned') NOT NULL DEFAULT 'active',
  tx_signature VARCHAR(128) NULL,
  contract_stake_ref VARCHAR(128) NULL,
  PRIMARY KEY (id),
  KEY idx_staking_wallet (wallet),
  KEY idx_staking_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function main() {
  loadEnvLocal();
  const config = getConfig();

  console.log(`Connecting to ${config.host}:${config.port}/${config.database}…`);

  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl,
  });

  try {
    await pool.query(NODES_TABLE);
    console.log("✓ nodes table ready");
    await pool.query(STAKING_TABLE);
    console.log("✓ staking table ready");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
