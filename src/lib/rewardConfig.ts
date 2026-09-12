/** Wallet issuance fee paid by issuer to treasury (devnet). */
export const WALLET_ISSUANCE_FEE_SOL = 0.001;

export const WALLET_ISSUANCE_FEE_LAMPORTS = Math.round(
  WALLET_ISSUANCE_FEE_SOL * 1_000_000_000,
);

/** Minimum accrued SOL before GUI withdraw is enabled. */
export const SOL_WITHDRAW_MIN = 0.01;

/** TAICW per MPC event type (wallet keygen committee excluded). */
export const TOKEN_REWARD_AMOUNTS = {
  heartbeat: 1,
  will_create: 10,
  will_update: 5,
  will_execute: 50,
  sign: 2,
} as const;

export type MpcRewardEventType = keyof typeof TOKEN_REWARD_AMOUNTS;

export const MPC_REWARD_EVENT_TYPES = Object.keys(
  TOKEN_REWARD_AMOUNTS,
) as MpcRewardEventType[];

/** Devnet TAICW — set after `npm run rewards:mint-taicw`. */
export function getRewardTokenMint(): string | null {
  return process.env.REWARD_TOKEN_MINT?.trim() || null;
}

export function getRewardTokenSymbol(): string {
  return process.env.REWARD_TOKEN_SYMBOL?.trim() || "TAICW";
}

export function getRewardTokenDecimals(): number {
  const n = Number(process.env.REWARD_TOKEN_DECIMALS ?? 9);
  return Number.isFinite(n) && n >= 0 ? n : 9;
}

/** Total TAICW supply minted to treasury (whole tokens). */
export const REWARD_TOKEN_TOTAL_SUPPLY = 1_000_000_000;
