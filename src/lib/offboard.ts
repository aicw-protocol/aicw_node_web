import {
  countNodesByOwner,
  deleteNodeByOwner,
  findNodeByIdAndOwner,
} from "@/lib/db/nodes";
import {
  getActiveStakeByWallet,
  getPendingUnstakeByWallet,
  markStakeReturned,
  requestUnstakeForWallet,
} from "@/lib/db/staking";
import { logUnstakeEvent } from "@/lib/db/unstakeEvents";
import type { StakingRecord } from "@/lib/db/types";
import { removeNodeFromMembershipWhitelist } from "@/lib/consul/membershipWhitelist";
import { NODE_ACTIVE_PING_MS, UNSTAKE_COOLDOWN_HOURS } from "@/lib/unstakeConstants";

export type OffboardPhase =
  | "node_removed"
  | "unstake_requested"
  | "waiting_return"
  | "returned"
  | "no_stake"
  | "already_pending";

export interface OffboardNodeResult {
  phase: OffboardPhase;
  wallet: string;
  nodeId: string;
  nodeName: string | null;
  remainingNodes: number;
  stake: StakingRecord | null;
  returnAvailableAt: string | null;
  message: string;
}

function isNodeRecentlyActive(lastPingAt: string | null): boolean {
  if (!lastPingAt) return false;
  const pingMs = Date.parse(lastPingAt);
  if (!Number.isFinite(pingMs)) return false;
  return Date.now() - pingMs < NODE_ACTIVE_PING_MS;
}

export async function offboardNode(input: {
  wallet: string;
  nodeId: string;
  nodeName?: string | null;
}): Promise<OffboardNodeResult> {
  const wallet = input.wallet.trim();
  const nodeId = input.nodeId.trim();
  const nodeName = input.nodeName?.trim() || null;

  const node = await findNodeByIdAndOwner({ nodeId, ownerWallet: wallet });
  if (!node) {
    throw new Error("Node not found or not owned by this wallet");
  }

  if (isNodeRecentlyActive(node.lastPingAt)) {
    throw new Error(
      "This node appears to be still active on the network. Stop it in the GUI and wait a few minutes before unstaking.",
    );
  }

  await logUnstakeEvent({
    wallet,
    nodeId,
    nodeName: nodeName ?? node.nodeName,
    eventType: "node_offboard_started",
    detail: "Offboard initiated from GUI or web dashboard",
  });

  const deleted = await deleteNodeByOwner({ nodeId, ownerWallet: wallet });
  if (!deleted) {
    throw new Error("Failed to remove node registration");
  }

  try {
    await removeNodeFromMembershipWhitelist(nodeId);
  } catch (error) {
    console.error("offboard consul cleanup failed:", error);
  }

  await logUnstakeEvent({
    wallet,
    nodeId,
    nodeName: nodeName ?? node.nodeName,
    eventType: "node_deregistered",
    detail: "Node removed from database and membership whitelist",
  });

  const remainingNodes = await countNodesByOwner(wallet);

  if (remainingNodes > 0) {
    return {
      phase: "node_removed",
      wallet,
      nodeId,
      nodeName: nodeName ?? node.nodeName,
      remainingNodes,
      stake: null,
      returnAvailableAt: null,
      message: `${remainingNodes} registered node(s) remain. Unstake will begin when all nodes are removed.`,
    };
  }

  const pending = await getPendingUnstakeByWallet(wallet);
  if (pending) {
    return {
      phase: pending.returnAvailableAt && Date.parse(pending.returnAvailableAt) <= Date.now()
        ? "waiting_return"
        : "already_pending",
      wallet,
      nodeId,
      nodeName: nodeName ?? node.nodeName,
      remainingNodes: 0,
      stake: pending,
      returnAvailableAt: pending.returnAvailableAt,
      message: `Unstake already requested. SOL will be returned after the ${UNSTAKE_COOLDOWN_HOURS}-hour waiting period.`,
    };
  }

  const activeStake = await getActiveStakeByWallet(wallet);
  if (!activeStake || activeStake.amountSol <= 0) {
    return {
      phase: "no_stake",
      wallet,
      nodeId,
      nodeName: nodeName ?? node.nodeName,
      remainingNodes: 0,
      stake: null,
      returnAvailableAt: null,
      message: "No staked SOL on this wallet. Offboarding complete.",
    };
  }

  const stake = await requestUnstakeForWallet({
    wallet,
    nodeId,
    nodeName: nodeName ?? node.nodeName,
  });

  await logUnstakeEvent({
    stakingId: stake.id,
    wallet,
    nodeId,
    nodeName: nodeName ?? node.nodeName,
    eventType: "unstake_requested",
    detail: `Unstake approved; return scheduled after ${UNSTAKE_COOLDOWN_HOURS} hours`,
  });

  await logUnstakeEvent({
    stakingId: stake.id,
    wallet,
    nodeId,
    nodeName: nodeName ?? node.nodeName,
    eventType: "return_scheduled",
    detail: stake.returnAvailableAt
      ? `Return available at ${stake.returnAvailableAt}`
      : null,
  });

  return {
    phase: "unstake_requested",
    wallet,
    nodeId,
    nodeName: nodeName ?? node.nodeName,
    remainingNodes: 0,
    stake,
    returnAvailableAt: stake.returnAvailableAt,
    message: `Unstake approved. Staked SOL will be returned to ${wallet} after ${UNSTAKE_COOLDOWN_HOURS} hours.`,
  };
}

export interface OffboardStatus {
  wallet: string;
  registeredNodeCount: number;
  activeStake: StakingRecord | null;
  pendingUnstake: StakingRecord | null;
  canOffboardNodes: boolean;
  blockReason: string | null;
  returnAvailableAt: string | null;
  hoursUntilReturn: number | null;
  isReturnDue: boolean;
}

export async function getOffboardStatus(wallet: string): Promise<OffboardStatus> {
  const trimmed = wallet.trim();
  const [registeredNodeCount, activeStake, pendingUnstake] = await Promise.all([
    countNodesByOwner(trimmed),
    getActiveStakeByWallet(trimmed),
    getPendingUnstakeByWallet(trimmed),
  ]);

  let returnAvailableAt = pendingUnstake?.returnAvailableAt ?? null;
  let hoursUntilReturn: number | null = null;
  let isReturnDue = false;

  if (returnAvailableAt) {
    const dueMs = Date.parse(returnAvailableAt);
    if (Number.isFinite(dueMs)) {
      const diffMs = dueMs - Date.now();
      isReturnDue = diffMs <= 0;
      hoursUntilReturn = isReturnDue ? 0 : diffMs / (60 * 60 * 1000);
    }
  }

  return {
    wallet: trimmed,
    registeredNodeCount,
    activeStake,
    pendingUnstake,
    canOffboardNodes: registeredNodeCount > 0,
    blockReason: null,
    returnAvailableAt,
    hoursUntilReturn,
    isReturnDue,
  };
}

export async function processDueUnstakeReturns(): Promise<
  { processed: number; results: { wallet: string; txSignature?: string; error?: string }[] }
> {
  const { listDueUnstakeReturns } = await import("@/lib/db/staking");
  const { sendStakeReturn } = await import("@/lib/returnStake");

  const due = await listDueUnstakeReturns();
  const results: { wallet: string; txSignature?: string; error?: string }[] = [];

  for (const stake of due) {
    try {
      const txSignature = await sendStakeReturn({
        recipientWallet: stake.wallet,
        amountSol: stake.amountSol,
      });

      await markStakeReturned({ stakeId: stake.id, returnTxSignature: txSignature });
      await logUnstakeEvent({
        stakingId: stake.id,
        wallet: stake.wallet,
        nodeId: stake.lastInitiatedNodeId,
        nodeName: stake.lastInitiatedNodeName,
        eventType: "return_sent",
        detail: `Returned ${stake.amountSol} SOL. tx=${txSignature}`,
      });

      results.push({ wallet: stake.wallet, txSignature });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Return failed";
      await logUnstakeEvent({
        stakingId: stake.id,
        wallet: stake.wallet,
        nodeId: stake.lastInitiatedNodeId,
        nodeName: stake.lastInitiatedNodeName,
        eventType: "return_failed",
        detail: message,
      });
      results.push({ wallet: stake.wallet, error: message });
    }
  }

  return { processed: results.length, results };
}
