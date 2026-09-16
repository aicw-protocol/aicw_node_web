import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { meetsMinimumStake, solFromLamports } from "@/lib/stakingCurve";

export async function verifyStakeTransaction(params: {
  connection: Connection;
  txSignature: string;
  expectedSender: string;
  expectedRecipient: string;
  minAmountSol: number;
}): Promise<{ amountSol: number }> {
  const parsed = await params.connection.getParsedTransaction(
    params.txSignature,
    {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    },
  );

  if (!parsed?.meta || parsed.meta.err) {
    throw new Error("Transaction not found or failed on-chain");
  }

  const sender = new PublicKey(params.expectedSender);
  const recipient = new PublicKey(params.expectedRecipient);

  let transferredLamports = 0;

  for (const instruction of parsed.transaction.message.instructions) {
    if (!("parsed" in instruction) || !instruction.parsed) continue;
    if (instruction.program !== "system") continue;
    if (instruction.parsed.type !== "transfer") continue;

    const info = instruction.parsed.info as {
      source?: string;
      destination?: string;
      lamports?: number;
    };

    if (info.source !== sender.toBase58()) continue;
    if (info.destination !== recipient.toBase58()) continue;

    transferredLamports += Number(info.lamports ?? 0);
  }

  if (transferredLamports <= 0) {
    throw new Error("No SOL transfer to the staking treasury was found");
  }

  const amountSol = solFromLamports(transferredLamports);
  if (!meetsMinimumStake(amountSol, params.minAmountSol)) {
    throw new Error(
      `Transferred ${amountSol.toFixed(6)} SOL but at least ${params.minAmountSol} SOL is required`,
    );
  }

  // Sanity: ensure system program was involved
  const accountKeys = parsed.transaction.message.accountKeys.map((k) =>
    typeof k === "string" ? k : k.pubkey.toBase58(),
  );
  if (!accountKeys.includes(SystemProgram.programId.toBase58())) {
    throw new Error("Invalid staking transaction");
  }

  return { amountSol };
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}
