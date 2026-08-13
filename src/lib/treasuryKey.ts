import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Parse STAKING_TREASURY_SECRET_KEY from either:
 * - Solana CLI JSON byte array: [1,2,3,...]
 * - Base58 encoded secret (Phantom / Solflare export style)
 */
export function keypairFromTreasurySecret(raw: string): Keypair {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("STAKING_TREASURY_SECRET_KEY is empty");
  }

  if (trimmed.startsWith("[")) {
    const bytes = JSON.parse(trimmed) as number[];
    if (!Array.isArray(bytes) || bytes.length === 0) {
      throw new Error("invalid JSON byte array");
    }
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  }

  const decoded = bs58.decode(trimmed);
  if (decoded.length === 64) {
    return Keypair.fromSecretKey(decoded);
  }
  if (decoded.length === 32) {
    return Keypair.fromSeed(decoded);
  }

  throw new Error(
    "STAKING_TREASURY_SECRET_KEY must be a JSON byte array or base58 secret key",
  );
}

export function isTreasurySecretConfigured(): boolean {
  const raw = process.env.STAKING_TREASURY_SECRET_KEY?.trim();
  if (!raw) return false;
  try {
    keypairFromTreasurySecret(raw);
    return true;
  } catch {
    return false;
  }
}
