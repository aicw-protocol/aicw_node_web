import { PublicKey } from "@solana/web3.js";

export function getStakingTreasuryWallet(): string {
  const wallet =
    process.env.STAKING_TREASURY_WALLET?.trim() ||
    process.env.NEXT_PUBLIC_STAKING_TREASURY_WALLET?.trim();

  if (!wallet) {
    throw new Error(
      "STAKING_TREASURY_WALLET is not configured. Set it in .env.local.",
    );
  }

  try {
    return new PublicKey(wallet).toBase58();
  } catch {
    throw new Error("STAKING_TREASURY_WALLET is not a valid Solana address");
  }
}

export function isStakingTreasuryConfigured(): boolean {
  const wallet =
    process.env.STAKING_TREASURY_WALLET?.trim() ||
    process.env.NEXT_PUBLIC_STAKING_TREASURY_WALLET?.trim();
  if (!wallet) return false;
  try {
    new PublicKey(wallet);
    return true;
  } catch {
    return false;
  }
}
