/**
 * Validate treasury + cron env for unstake auto-return.
 * Usage: npm run unstake:check-config
 */
import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAdminSecret,
  getCronSecret,
  getNodeWebBaseUrl,
  loadEnvLocal,
} from "./env-local.mjs";
import { keypairFromTreasurySecret } from "./treasury-key.mjs";

loadEnvLocal();

const issues = [];
const warnings = [];
const ok = [];

function check(name, pass, detail) {
  if (pass) ok.push({ name, detail });
  else issues.push({ name, detail });
}

function warn(name, detail) {
  warnings.push({ name, detail });
}

const treasuryWallet = process.env.STAKING_TREASURY_WALLET?.trim();
const treasurySecret = process.env.STAKING_TREASURY_SECRET_KEY?.trim();
const rpcUrl =
  process.env.SOLANA_RPC_URL?.trim() ||
  process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() ||
  "https://api.mainnet-beta.solana.com";

check("STAKING_TREASURY_WALLET", Boolean(treasuryWallet), treasuryWallet || "missing");
check("CRON_SECRET", Boolean(getCronSecret()), getCronSecret() ? "set" : "missing");
check("ADMIN_SECRET", Boolean(getAdminSecret()), getAdminSecret() ? "set" : "missing (optional but recommended)");
check("API base URL", Boolean(getNodeWebBaseUrl()), getNodeWebBaseUrl());

let keypair = null;
if (treasurySecret) {
  try {
    keypair = keypairFromTreasurySecret(treasurySecret);
    check(
      "STAKING_TREASURY_SECRET_KEY",
      true,
      `valid secret → ${keypair.publicKey.toBase58()}`,
    );
  } catch (error) {
    check(
      "STAKING_TREASURY_SECRET_KEY",
      false,
      error instanceof Error ? error.message : "invalid secret key",
    );
  }
} else {
  check("STAKING_TREASURY_SECRET_KEY", false, "missing");
}

if (treasuryWallet && keypair) {
  try {
    const expected = new PublicKey(treasuryWallet).toBase58();
    const actual = keypair.publicKey.toBase58();
    check(
      "wallet/key match",
      expected === actual,
      expected === actual
        ? "public key matches STAKING_TREASURY_WALLET"
        : `mismatch: wallet=${expected}, key=${actual}`,
    );
  } catch {
    check("STAKING_TREASURY_WALLET", false, "invalid Solana address");
  }
}

if (keypair) {
  try {
    const connection = new Connection(rpcUrl, "confirmed");
    const balance = await connection.getBalance(keypair.publicKey);
    const sol = balance / LAMPORTS_PER_SOL;
    const detail = `${sol.toFixed(6)} SOL on ${rpcUrl}`;
    if (balance > 0) {
      check("treasury balance", true, detail);
    } else {
      warn("treasury balance", `${detail} — fund this wallet for unstake returns`);
    }
  } catch (error) {
    check(
      "treasury balance",
      false,
      error instanceof Error ? error.message : "RPC check failed",
    );
  }
}

console.log("\n=== Unstake return config ===\n");
for (const item of ok) {
  console.log(`✓ ${item.name}: ${item.detail}`);
}
for (const item of issues) {
  console.log(`✗ ${item.name}: ${item.detail}`);
}
for (const item of warnings) {
  console.log(`⚠ ${item.name}: ${item.detail}`);
}

if (issues.length > 0) {
  console.log("\nFix the required items above in aicw_node_web/.env.local");
  process.exit(1);
}

console.log("\nAll required checks passed.");
if (warnings.length > 0) {
  console.log("Address warnings above before processing the first unstake return.");
}
console.log("\nRegister cron (if not done): npm run unstake:setup-cron");
