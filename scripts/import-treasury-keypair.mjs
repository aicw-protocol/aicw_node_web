/**
 * Import Solana CLI keypair JSON into STAKING_TREASURY_SECRET_KEY (.env.local).
 * Usage: node scripts/import-treasury-keypair.mjs path/to/keypair.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Keypair } from "@solana/web3.js";
import { loadEnvLocal } from "./env-local.mjs";

const keypairPath = process.argv[2];
if (!keypairPath) {
  console.error("Usage: node scripts/import-treasury-keypair.mjs <keypair.json>");
  process.exit(1);
}

loadEnvLocal();

const absPath = resolve(process.cwd(), keypairPath);
if (!existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(1);
}

const raw = readFileSync(absPath, "utf8").trim();
let bytes;
try {
  bytes = JSON.parse(raw);
  Keypair.fromSecretKey(Uint8Array.from(bytes));
} catch {
  console.error("Invalid keypair JSON (expected Solana CLI byte array)");
  process.exit(1);
}

const pubkey = Keypair.fromSecretKey(Uint8Array.from(bytes)).publicKey.toBase58();
const envPath = resolve(process.cwd(), ".env.local");
let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

function setEnv(key, value) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content += (content.endsWith("\n") || content.length === 0 ? "" : "\n") + `${line}\n`;
  }
}

setEnv("STAKING_TREASURY_SECRET_KEY", raw);
if (!process.env.STAKING_TREASURY_WALLET?.trim()) {
  setEnv("STAKING_TREASURY_WALLET", pubkey);
}

writeFileSync(envPath, content, "utf8");

console.log(`✓ STAKING_TREASURY_SECRET_KEY imported from ${absPath}`);
console.log(`  Public key: ${pubkey}`);

const configuredWallet = process.env.STAKING_TREASURY_WALLET?.trim();
if (configuredWallet && configuredWallet !== pubkey) {
  console.warn(
    `⚠ STAKING_TREASURY_WALLET (${configuredWallet}) differs from keypair (${pubkey})`,
  );
  console.warn("  Update STAKING_TREASURY_WALLET or use the matching keypair file.");
}

console.log("\nNext: npm run unstake:check-config");
