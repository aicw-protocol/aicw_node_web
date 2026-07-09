import { countRegisteredNodes } from "@/lib/db/nodes";
import { getActiveStakeByWallet } from "@/lib/db/staking";
import {
  formatStakeSol,
  meetsMinimumStake,
  requiredStakeSol,
} from "@/lib/stakingCurve";

export interface RegistrationEligibility {
  registeredNodeCount: number;
  requiredStakeSol: number;
  canRegister: boolean;
  blockReason: string | null;
}

export async function getRegistrationEligibility(
  wallet: string,
): Promise<RegistrationEligibility> {
  const registeredNodeCount = await countRegisteredNodes();
  const required = requiredStakeSol(registeredNodeCount);

  if (required <= 0) {
    return {
      registeredNodeCount,
      requiredStakeSol: 0,
      canRegister: true,
      blockReason: null,
    };
  }

  const stake = await getActiveStakeByWallet(wallet);
  if (
    stake?.status === "active" &&
    meetsMinimumStake(stake.amountSol, required)
  ) {
    return {
      registeredNodeCount,
      requiredStakeSol: required,
      canRegister: true,
      blockReason: null,
    };
  }

  const blockReason = stake
    ? `Active stake must be at least ${formatStakeSol(required)} SOL for the current curve.`
    : `Stake at least ${formatStakeSol(required)} SOL on the Staking page before registering a node.`;

  return {
    registeredNodeCount,
    requiredStakeSol: required,
    canRegister: false,
    blockReason,
  };
}

export async function assertCanRegisterNode(wallet: string): Promise<void> {
  const eligibility = await getRegistrationEligibility(wallet);
  if (!eligibility.canRegister) {
    throw new Error(eligibility.blockReason ?? "Not eligible to register a node");
  }
}
