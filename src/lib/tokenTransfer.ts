import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getRewardTokenDecimals, getRewardTokenMint } from "@/lib/rewardConfig";
import { keypairFromTreasurySecret } from "@/lib/treasuryKey";

function getSolanaRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC?.trim() ||
    "https://api.devnet.solana.com"
  );
}

function getTreasuryKeypair(): Keypair {
  const raw = process.env.STAKING_TREASURY_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error("STAKING_TREASURY_SECRET_KEY is not configured");
  }
  return keypairFromTreasurySecret(raw);
}

function tokenBaseUnits(amount: number): bigint {
  const decimals = getRewardTokenDecimals();
  return BigInt(Math.round(amount * 10 ** decimals));
}

export async function sendTokenReward(input: {
  recipientWallet: string;
  amountToken: number;
}): Promise<string> {
  const mintStr = getRewardTokenMint();
  if (!mintStr) {
    throw new Error("REWARD_TOKEN_MINT is not configured");
  }
  if (!Number.isFinite(input.amountToken) || input.amountToken <= 0) {
    throw new Error("Token amount must be greater than zero");
  }

  const mint = new PublicKey(mintStr);
  const recipient = new PublicKey(input.recipientWallet.trim());
  const treasury = getTreasuryKeypair();
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");

  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: treasury.publicKey,
  });

  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      treasury.publicKey,
      recipientAta,
      recipient,
      mint,
    ),
    createTransferInstruction(
      treasuryAta,
      recipientAta,
      treasury.publicKey,
      tokenBaseUnits(input.amountToken),
    ),
  );

  return sendAndConfirmTransaction(connection, tx, [treasury], {
    commitment: "confirmed",
  });
}
