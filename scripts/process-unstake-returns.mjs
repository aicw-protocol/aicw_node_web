/**
 * Trigger POST /api/cron/process-unstake-returns
 * Usage: npm run unstake:process
 */
import { getCronSecret, getNodeWebBaseUrl, loadEnvLocal } from "./env-local.mjs";

loadEnvLocal();

const baseUrl = getNodeWebBaseUrl();
const secret = getCronSecret();

if (!secret) {
  console.error("CRON_SECRET is not set in .env.local");
  process.exit(1);
}

const endpoint = `${baseUrl}/api/cron/process-unstake-returns`;

console.log(`POST ${endpoint}`);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
  },
});

const text = await response.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

if (!response.ok) {
  console.error("Failed:", response.status, json);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));
