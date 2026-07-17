import type { NodeRecord, StakingRecord } from "@/lib/db/types";
import { getRegistrationEligibility } from "@/lib/nodeEligibility";
import { getActiveStakeByWallet } from "@/lib/db/staking";
import { listNodesByOwner } from "@/lib/db/nodes";
import { getOnboardingConfig } from "@/lib/onboardingConfig";
import { meetsMinimumStake } from "@/lib/stakingCurve";

export type GuiRecommendedAction =
  | "stake_on_web"
  | "register_on_web"
  | "setup_local"
  | "ready_to_run";

export interface GuiWalletStatus {
  wallet: string;
  eligibility: Awaited<ReturnType<typeof getRegistrationEligibility>>;
  activeStake: StakingRecord | null;
  nodes: NodeRecord[];
  gui: {
    recommendedAction: GuiRecommendedAction;
    canLaunchNode: boolean;
    stakingUrl: string;
    dashboardUrl: string;
    registerUrl: string;
    onboardingUrl: string;
  };
}

function buildGuiUrls(baseUrl: string, wallet: string) {
  const encoded = encodeURIComponent(wallet);
  return {
    stakingUrl: `${baseUrl}/staking`,
    dashboardUrl: `${baseUrl}/dashboard?wallet=${encoded}`,
    registerUrl: `${baseUrl}/dashboard?wallet=${encoded}`,
    onboardingUrl: `${baseUrl}/dashboard?wallet=${encoded}`,
  };
}

export async function getGuiWalletStatus(wallet: string): Promise<GuiWalletStatus> {
  const { nodeWebUrl } = getOnboardingConfig();
  const baseUrl = nodeWebUrl || "https://node.aicw.ai";
  const urls = buildGuiUrls(baseUrl, wallet);

  const [eligibility, activeStake, nodes] = await Promise.all([
    getRegistrationEligibility(wallet),
    getActiveStakeByWallet(wallet),
    listNodesByOwner(wallet),
  ]);

  const hasStake =
    eligibility.requiredStakeSol <= 0 ||
    (activeStake?.status === "active" &&
      meetsMinimumStake(activeStake.amountSol, eligibility.requiredStakeSol));

  let recommendedAction: GuiRecommendedAction = "ready_to_run";
  if (!hasStake) {
    recommendedAction = "stake_on_web";
  } else if (nodes.length === 0) {
    recommendedAction = "register_on_web";
  } else {
    recommendedAction = "setup_local";
  }

  const canLaunchNode = hasStake && nodes.length > 0;

  return {
    wallet,
    eligibility,
    activeStake,
    nodes,
    gui: {
      recommendedAction,
      canLaunchNode,
      ...urls,
    },
  };
}
