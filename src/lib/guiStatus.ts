import type { NodeRecord, StakingRecord } from "@/lib/db/types";
import { getRegistrationEligibility } from "@/lib/nodeEligibility";
import {
  countUnboundActiveStakes,
  listActiveStakesByWallet,
} from "@/lib/db/staking";
import { listNodesByOwner } from "@/lib/db/nodes";
import { getOnboardingConfig } from "@/lib/onboardingConfig";

export type GuiRecommendedAction =
  | "stake_on_web"
  | "register_in_app"
  | "setup_local"
  | "ready_to_run";

export interface GuiWalletStatus {
  wallet: string;
  eligibility: Awaited<ReturnType<typeof getRegistrationEligibility>>;
  activeStakes: StakingRecord[];
  unboundActiveStakes: number;
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

function buildGuiUrls(baseUrl: string, wallet: string, releasesUrl: string) {
  const encoded = encodeURIComponent(wallet);
  return {
    stakingUrl: `${baseUrl}/staking`,
    dashboardUrl: `${baseUrl}/dashboard?wallet=${encoded}`,
    registerUrl: releasesUrl,
    onboardingUrl: `${baseUrl}/guide#quick-start`,
  };
}

export async function getGuiWalletStatus(wallet: string): Promise<GuiWalletStatus> {
  const { nodeWebUrl, releasesUrl } = getOnboardingConfig();
  const baseUrl = nodeWebUrl || "https://node.aicw.ai";
  const urls = buildGuiUrls(baseUrl, wallet, releasesUrl);

  const [eligibility, activeStakes, unboundActiveStakes, nodes] = await Promise.all([
    getRegistrationEligibility(wallet),
    listActiveStakesByWallet(wallet),
    countUnboundActiveStakes(wallet),
    listNodesByOwner(wallet),
  ]);

  const canRegisterNextNode =
    eligibility.requiredStakeSol <= 0 || unboundActiveStakes >= 1;

  let recommendedAction: GuiRecommendedAction = "ready_to_run";
  if (!canRegisterNextNode && nodes.length === 0) {
    recommendedAction = "stake_on_web";
  } else if (!canRegisterNextNode && nodes.length > 0) {
    recommendedAction = "stake_on_web";
  } else if (nodes.length === 0) {
    recommendedAction = "register_in_app";
  } else {
    recommendedAction = "setup_local";
  }

  const canLaunchNode = nodes.length > 0;

  return {
    wallet,
    eligibility,
    activeStakes,
    unboundActiveStakes,
    activeStake: activeStakes[0] ?? null,
    nodes,
    gui: {
      recommendedAction,
      canLaunchNode,
      ...urls,
    },
  };
}
