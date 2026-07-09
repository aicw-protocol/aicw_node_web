import { NextResponse } from "next/server";
import { countRegisteredNodes } from "@/lib/db/nodes";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  buildCurvePoints,
  FREE_NODE_THRESHOLD,
  requiredStakeSol,
  formatStakeSol,
} from "@/lib/stakingCurve";
import {
  getStakingTreasuryWallet,
  isStakingTreasuryConfigured,
} from "@/lib/stakingConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  try {
    const registeredNodeCount = await countRegisteredNodes();
    const required = requiredStakeSol(registeredNodeCount);
    const chartMax = Math.max(registeredNodeCount + 25, FREE_NODE_THRESHOLD + 20);

    let treasuryWallet: string | null = null;
    if (isStakingTreasuryConfigured()) {
      treasuryWallet = getStakingTreasuryWallet();
    }

    return NextResponse.json({
      registeredNodeCount,
      requiredStakeSol: required,
      requiredStakeSolFormatted: formatStakeSol(required),
      freeNodeThreshold: FREE_NODE_THRESHOLD,
      treasuryWallet,
      points: buildCurvePoints(chartMax),
    });
  } catch (error) {
    console.error("GET /api/staking/curve failed:", error);
    return NextResponse.json(
      { error: "Failed to load staking curve" },
      { status: 500 },
    );
  }
}
