import { countRegisteredNodes } from "@/lib/db/nodes";
import { countGlobalUnboundActiveStakes } from "@/lib/db/staking";
import {
  curvePositionForNextStake,
  requiredStakeForNextSlot,
} from "@/lib/stakingCurve";

export interface NextStakeCurveState {
  registeredNodeCount: number;
  globalUnboundActiveStakes: number;
  curvePosition: number;
  requiredStakeSol: number;
}

export async function getNextStakeCurveState(): Promise<NextStakeCurveState> {
  const [registeredNodeCount, globalUnboundActiveStakes] = await Promise.all([
    countRegisteredNodes(),
    countGlobalUnboundActiveStakes(),
  ]);

  const curvePosition = curvePositionForNextStake(
    registeredNodeCount,
    globalUnboundActiveStakes,
  );

  return {
    registeredNodeCount,
    globalUnboundActiveStakes,
    curvePosition,
    requiredStakeSol: requiredStakeForNextSlot(
      registeredNodeCount,
      globalUnboundActiveStakes,
    ),
  };
}
