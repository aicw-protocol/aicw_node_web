/**
 * Append CRON_SECRET / ADMIN_SECRET to .env.local if missing.
 * Usage: node scripts/generate-unstake-secrets.mjs
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./env-local.mjs";

loadEnvLocal();

const envPath = resolve(process.cwd(), ".env.local");
let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

function ensureLine(key) {
  if (process.env[key]?.trim()) {
    console.log(`✓ ${key} already set`);
    return;
  }
  const value = randomBytes(32).toString("hex");
  const line = `${key}=${value}`;
  content += content.endsWith("\n") || content.length === 0 ? "" : "\n";
  content += `${line}\n`;
  process.env[key] = value;
  console.log(`+ added ${key}`);
}

ensureLine("CRON_SECRET");
ensureLine("ADMIN_SECRET");

writeFileSync(envPath, content, "utf8");
console.log(`Updated ${envPath}`);
