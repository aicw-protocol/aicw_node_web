import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listNodesByOwner } from "@/lib/db/nodes";
import { getActiveStakeByWallet } from "@/lib/db/staking";
import { getRegistrationEligibility } from "@/lib/nodeEligibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet query parameter is required" },
      { status: 400 },
    );
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const [nodes, eligibility, activeStake] = await Promise.all([
      listNodesByOwner(wallet),
      getRegistrationEligibility(wallet),
      getActiveStakeByWallet(wallet),
    ]);

    const totals = nodes.reduce(
      (acc, node) => ({
        referralWalletOpens: acc.referralWalletOpens + node.referralWalletOpens,
        rewardSol: acc.rewardSol + node.rewardSol,
        rewardToken: acc.rewardToken + node.rewardToken,
      }),
      { referralWalletOpens: 0, rewardSol: 0, rewardToken: 0 },
    );

    return NextResponse.json({
      nodes,
      eligibility,
      activeStake,
      totals,
    });
  } catch (error) {
    console.error("GET /api/dashboard failed:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
