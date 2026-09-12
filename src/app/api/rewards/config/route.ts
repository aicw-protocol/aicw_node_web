import { NextResponse } from "next/server";
import {
  SOL_WITHDRAW_MIN,
  WALLET_ISSUANCE_FEE_LAMPORTS,
  WALLET_ISSUANCE_FEE_SOL,
  getRewardTokenMint,
  getRewardTokenSymbol,
} from "@/lib/rewardConfig";
import { rewardCorsHeaders } from "@/lib/rewardCors";
import { getStakingTreasuryWallet, isStakingTreasuryConfigured } from "@/lib/stakingConfig";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: rewardCorsHeaders });
}

export async function GET() {
  let treasuryWallet: string | null = null;
  if (isStakingTreasuryConfigured()) {
    try {
      treasuryWallet = getStakingTreasuryWallet();
    } catch {
      treasuryWallet = null;
    }
  }

  return NextResponse.json(
    {
      treasuryWallet,
      walletIssuanceFeeSol: WALLET_ISSUANCE_FEE_SOL,
      walletIssuanceFeeLamports: WALLET_ISSUANCE_FEE_LAMPORTS,
      solWithdrawMin: SOL_WITHDRAW_MIN,
      tokenSymbol: getRewardTokenSymbol(),
      tokenMint: getRewardTokenMint(),
    },
    { headers: rewardCorsHeaders },
  );
}
