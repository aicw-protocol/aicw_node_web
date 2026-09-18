import type { RowDataPacket } from "mysql2";
import { getPool } from "./pool";
import { getNetworkRewardSummary, type NodeRewardBalance } from "./rewards";
import { ensureRewardSchema } from "./rewardSchema";
import type { NodeRecord, NodeStatus } from "./types";

interface NodeRewardRow extends RowDataPacket {
  id: number;
  node_id: string;
  created_at: Date;
  status: NodeStatus;
  committee_wallet_opens: number;
  referral_wallet_opens: number;
  reward_sol: string;
  reward_token: string;
  withdrawn_sol: string;
  withdrawn_token: string;
}

export interface NodeRewardEntry extends Pick<
  NodeRecord,
  "id" | "nodeId" | "createdAt" | "status"
> {
  committeeWalletOpens: number;
  accruedSol: number;
  availableSol: number;
  accruedToken: number;
  availableToken: number;
  rewardSol: number;
  rewardToken: number;
}

export interface NodeRewardsSummary {
  registeredNodes: number;
  nodesWithActivity: number;
  totalWalletOpens: number;
  totalRewardSol: number;
  totalAvailableSol: number;
  totalRewardToken: number;
  totalAvailableToken: number;
}

export interface NodeRewardsResponse {
  summary: NodeRewardsSummary;
  nodes: NodeRewardEntry[];
}

function mapNodeReward(row: NodeRewardRow): NodeRewardEntry {
  const accruedSol = Number(row.reward_sol);
  const withdrawnSol = Number(row.withdrawn_sol ?? 0);
  const accruedToken = Number(row.reward_token);
  const withdrawnToken = Number(row.withdrawn_token ?? 0);
  const committeeWalletOpens =
    row.committee_wallet_opens ?? row.referral_wallet_opens ?? 0;

  return {
    id: row.id,
    nodeId: row.node_id,
    createdAt: row.created_at.toISOString(),
    status: row.status,
    committeeWalletOpens,
    accruedSol,
    availableSol: Math.max(0, accruedSol - withdrawnSol),
    accruedToken,
    availableToken: Math.max(0, accruedToken - withdrawnToken),
    rewardSol: accruedSol,
    rewardToken: accruedToken,
  };
}

export async function listNodeRewards(): Promise<NodeRewardsResponse> {
  const pool = await getPool();
  await ensureRewardSchema(pool);

  const [rows] = await pool.query<NodeRewardRow[]>(
    `SELECT id, node_id, created_at, status,
            committee_wallet_opens, referral_wallet_opens,
            reward_sol, reward_token, withdrawn_sol, withdrawn_token
     FROM nodes
     WHERE status = 'registered'
     ORDER BY committee_wallet_opens DESC, reward_token DESC, created_at ASC`,
  );

  const nodes = rows.map(mapNodeReward);
  const network = await getNetworkRewardSummary();

  const nodesWithActivity = nodes.filter(
    (node) =>
      node.committeeWalletOpens > 0 ||
      node.accruedSol > 0 ||
      node.accruedToken > 0,
  ).length;

  return {
    summary: {
      registeredNodes: network.registeredNodes,
      nodesWithActivity,
      totalWalletOpens: network.walletIssuanceCount,
      totalRewardSol: network.totalAccruedSol,
      totalAvailableSol: network.totalAvailableSol,
      totalRewardToken: network.totalAccruedToken,
      totalAvailableToken: network.totalAvailableToken,
    },
    nodes,
  };
}

export type { NodeRewardBalance };
