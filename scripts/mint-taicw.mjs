/**
 * Mint TAICW SPL token on devnet and fund treasury ATA.
 * Usage: npm run rewards:mint-taicw
 *
 * Requires STAKING_TREASURY_SECRET_KEY in .env.local.
 * Writes REWARD_TOKEN_MINT to .env.local on success.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { loadEnvLocal } from "./env-local.mjs";
import { keypairFromTreasurySecret } from "./treasury-key.mjs";

const TOTAL_SUPPLY = 1_000_000_000;
const DECIMALS = 9;

function getRpcUrl() {
  return (
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() ||
    "https://api.devnet.solana.com"
  );
}

function getTreasuryKeypair() {
  const raw = process.env.STAKING_TREASURY_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error("STAKING_TREASURY_SECRET_KEY is not set in .env.local");
  }
  return keypairFromTreasurySecret(raw);
}

function setEnvLocal(key, value) {
  const envPath = resolve(process.cwd(), ".env.local");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content += (content.endsWith("\n") || content.length === 0 ? "" : "\n") + `${line}\n`;
  }
  writeFileSync(envPath, content, "utf8");
}

async function main() {
  loadEnvLocal();

  const existingMint = process.env.REWARD_TOKEN_MINT?.trim();
  if (existingMint) {
    console.log(`REWARD_TOKEN_MINT already set: ${existingMint}`);
    console.log("Delete REWARD_TOKEN_MINT from .env.local to mint a new token.");
    return;
  }

  const treasury = getTreasuryKeypair();
  const connection = new Connection(getRpcUrl(), "confirmed");
  const mintKeypair = Keypair.generate();

  console.log(`Treasury: ${treasury.publicKey.toBase58()}`);
  console.log(`Minting TAICW (${TOTAL_SUPPLY} tokens, ${DECIMALS} decimals)…`);

  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const treasuryAta = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    treasury.publicKey,
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: treasury.publicKey,
  });

  tx.add(
    SystemProgram.createAccount({
      fromPubkey: treasury.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  tx.add(
    createInitializeMint2Instruction(
      mintKeypair.publicKey,
      DECIMALS,
      treasury.publicKey,
      treasury.publicKey,
      TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      treasury.publicKey,
      treasuryAta,
      treasury.publicKey,
      mintKeypair.publicKey,
    ),
    createMintToInstruction(
      mintKeypair.publicKey,
      treasuryAta,
      treasury.publicKey,
      BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS),
    ),
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [treasury, mintKeypair], {
    commitment: "confirmed",
  });

  const mintAddress = mintKeypair.publicKey.toBase58();
  setEnvLocal("REWARD_TOKEN_MINT", mintAddress);
  if (!process.env.REWARD_TOKEN_SYMBOL?.trim()) {
    setEnvLocal("REWARD_TOKEN_SYMBOL", "TAICW");
  }
  if (!process.env.REWARD_TOKEN_DECIMALS?.trim()) {
    setEnvLocal("REWARD_TOKEN_DECIMALS", String(DECIMALS));
  }

  console.log(`✓ TAICW minted: ${mintAddress}`);
  console.log(`✓ Treasury ATA funded with ${TOTAL_SUPPLY.toLocaleString()} TAICW`);
  console.log(`✓ Transaction: ${sig}`);
  console.log("✓ REWARD_TOKEN_MINT saved to .env.local");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
