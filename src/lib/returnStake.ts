import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { lamportsFromSol } from "@/lib/stakingCurve";
import { isTreasurySecretConfigured, keypairFromTreasurySecret } from "@/lib/treasuryKey";

function getSolanaRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() ||
    "https://api.mainnet-beta.solana.com"
  );
}

function getTreasuryKeypair(): Keypair {
  const raw = process.env.STAKING_TREASURY_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error(
      "STAKING_TREASURY_SECRET_KEY is not configured. Set the treasury secret in .env.local or Vercel.",
    );
  }

  try {
    return keypairFromTreasurySecret(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid secret key";
    throw new Error(`STAKING_TREASURY_SECRET_KEY: ${message}`);
  }
}

export function isTreasuryReturnConfigured(): boolean {
  return isTreasurySecretConfigured();
}

export async function sendStakeReturn(input: {
  recipientWallet: string;
  amountSol: number;
}): Promise<string> {
  if (!Number.isFinite(input.amountSol) || input.amountSol <= 0) {
    throw new Error("Return amount must be greater than zero");
  }

  const recipient = new PublicKey(input.recipientWallet.trim());
  const treasury = getTreasuryKeypair();
  const lamports = lamportsFromSol(input.amountSol);

  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: treasury.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: recipient,
      lamports,
    }),
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasury],
    { commitment: "confirmed" },
  );

  return signature;
}
