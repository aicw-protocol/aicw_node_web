import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listNodesByOwner } from "@/lib/db/nodes";
import { getActiveStakeByWallet } from "@/lib/db/staking";
import { getRegistrationEligibility } from "@/lib/nodeEligibility";
import {
  SOL_WITHDRAW_MIN,
  getRewardTokenMint,
  getRewardTokenSymbol,
} from "@/lib/rewardConfig";

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

    const { getNodeBalancesByOwner } = await import("@/lib/db/rewards");
    const balances = await getNodeBalancesByOwner(wallet);

    const balanceByNodeId = new Map(balances.map((b) => [b.nodeId, b]));

    const nodesWithBalances = nodes.map((node) => {
      const balance = balanceByNodeId.get(node.nodeId);
      if (!balance) return node;
      return {
        ...node,
        committeeWalletOpens: balance.committeeWalletOpens,
        referralWalletOpens: balance.committeeWalletOpens,
        rewardSol: balance.accruedSol,
        rewardToken: balance.accruedToken,
        availableSol: balance.availableSol,
        availableToken: balance.availableToken,
        withdrawnSol: balance.withdrawnSol,
        withdrawnToken: balance.withdrawnToken,
      };
    });

    const totals = balances.reduce(
      (acc, node) => ({
        committeeWalletOpens:
          acc.committeeWalletOpens + node.committeeWalletOpens,
        referralWalletOpens:
          acc.referralWalletOpens + node.committeeWalletOpens,
        rewardSol: acc.rewardSol + node.accruedSol,
        availableSol: acc.availableSol + node.availableSol,
        rewardToken: acc.rewardToken + node.accruedToken,
        availableToken: acc.availableToken + node.availableToken,
      }),
      {
        committeeWalletOpens: 0,
        referralWalletOpens: 0,
        rewardSol: 0,
        availableSol: 0,
        rewardToken: 0,
        availableToken: 0,
      },
    );

    totals.referralWalletOpens = totals.committeeWalletOpens;

    return NextResponse.json({
      nodes: nodesWithBalances,
      eligibility,
      activeStake,
      totals,
      balances,
      rewardConfig: {
        solWithdrawMin: SOL_WITHDRAW_MIN,
        tokenSymbol: getRewardTokenSymbol(),
        tokenMint: getRewardTokenMint(),
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard failed:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
