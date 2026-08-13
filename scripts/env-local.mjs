import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** Load .env.local into process.env (does not override existing vars). */
export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");
  if (!existsSync(envPath)) return false;

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
  return true;
}

export function getNodeWebBaseUrl() {
  return (
    process.env.UNSTAKE_CRON_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_NODE_WEB_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:4003"
  ).replace(/\/$/, "");
}

export function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || "";
}

export function getAdminSecret() {
  return process.env.ADMIN_SECRET?.trim() || "";
}
