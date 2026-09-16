import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  buildCurvePoints,
  FREE_NODE_THRESHOLD,
  formatStakeSol,
} from "@/lib/stakingCurve";
import { getNextStakeCurveState } from "@/lib/stakingCurveState";
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
    const curveState = await getNextStakeCurveState();
    const { registeredNodeCount, globalUnboundActiveStakes, curvePosition, requiredStakeSol: required } =
      curveState;
    const chartMax = Math.max(curvePosition + 25, FREE_NODE_THRESHOLD + 20);

    let treasuryWallet: string | null = null;
    if (isStakingTreasuryConfigured()) {
      treasuryWallet = getStakingTreasuryWallet();
    }

    return NextResponse.json({
      registeredNodeCount,
      globalUnboundActiveStakes,
      curvePosition,
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
