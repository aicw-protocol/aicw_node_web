import { countUnboundActiveStakes } from "@/lib/db/staking";
import { formatStakeSol } from "@/lib/stakingCurve";
import { getNextStakeCurveState } from "@/lib/stakingCurveState";

export interface RegistrationEligibility {
  registeredNodeCount: number;
  requiredStakeSol: number;
  unboundActiveStakes: number;
  canRegister: boolean;
  blockReason: string | null;
}

export async function getRegistrationEligibility(
  wallet: string,
): Promise<RegistrationEligibility> {
  const [curveState, unboundActiveStakes] = await Promise.all([
    getNextStakeCurveState(),
    countUnboundActiveStakes(wallet),
  ]);
  const { registeredNodeCount, requiredStakeSol: required } = curveState;

  if (required <= 0) {
    return {
      registeredNodeCount,
      requiredStakeSol: 0,
      unboundActiveStakes,
      canRegister: true,
      blockReason: null,
    };
  }

  if (unboundActiveStakes >= 1) {
    return {
      registeredNodeCount,
      requiredStakeSol: required,
      unboundActiveStakes,
      canRegister: true,
      blockReason: null,
    };
  }

  return {
    registeredNodeCount,
    requiredStakeSol: required,
    unboundActiveStakes,
    canRegister: false,
    blockReason: `Stake ${formatStakeSol(required)} SOL on the Staking page for your next node (fee curve applies).`,
  };
}

export async function assertCanRegisterNode(wallet: string): Promise<void> {
  const eligibility = await getRegistrationEligibility(wallet);
  if (!eligibility.canRegister) {
    throw new Error(eligibility.blockReason ?? "Not eligible to register a node");
  }
}
