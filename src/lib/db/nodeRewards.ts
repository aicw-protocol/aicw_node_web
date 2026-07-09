import type { RowDataPacket } from "mysql2";
import { getPool } from "./pool";
import type { NodeRecord, NodeStatus } from "./types";

interface NodeRewardRow extends RowDataPacket {
  id: number;
  owner_wallet: string;
  node_id: string;
  created_at: Date;
  status: NodeStatus;
  referral_wallet_opens: number;
  reward_sol: string;
  reward_token: string;
}

export interface NodeRewardEntry extends Pick<
  NodeRecord,
  "id" | "ownerWallet" | "nodeId" | "createdAt" | "status" | "referralWalletOpens" | "rewardSol"
> {}

export interface NodeRewardsSummary {
  registeredNodes: number;
  nodesWithActivity: number;
  totalWalletOpens: number;
  totalRewardSol: number;
}

export interface NodeRewardsResponse {
  summary: NodeRewardsSummary;
  nodes: NodeRewardEntry[];
}

function mapNodeReward(row: NodeRewardRow): NodeRewardEntry {
  return {
    id: row.id,
    ownerWallet: row.owner_wallet,
    nodeId: row.node_id,
    createdAt: row.created_at.toISOString(),
    status: row.status,
    referralWalletOpens: row.referral_wallet_opens,
    rewardSol: Number(row.reward_sol),
  };
}

/**
 * List registered nodes with the SOL rewards they've earned from referred
 * wallet issuances. Nodes earn 0.001 SOL per wallet opened through them —
 * this is compensation for operating a node, not a competitive ranking.
 */
export async function listNodeRewards(): Promise<NodeRewardsResponse> {
  const pool = await getPool();

  const [rows] = await pool.query<NodeRewardRow[]>(
    `SELECT id, owner_wallet, node_id, created_at, status,
            referral_wallet_opens, reward_sol, reward_token
     FROM nodes
     WHERE status = 'registered'
     ORDER BY reward_sol DESC, referral_wallet_opens DESC, created_at ASC`,
  );

  const nodes = rows.map(mapNodeReward);

  const [countRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM nodes WHERE status = 'registered'",
  );

  const registeredNodes = Number(countRows[0]?.total ?? 0);
  const nodesWithActivity = nodes.filter(
    (node) => node.referralWalletOpens > 0 || node.rewardSol > 0,
  ).length;

  const totals = nodes.reduce(
    (acc, node) => ({
      totalWalletOpens: acc.totalWalletOpens + node.referralWalletOpens,
      totalRewardSol: acc.totalRewardSol + node.rewardSol,
    }),
    { totalWalletOpens: 0, totalRewardSol: 0 },
  );

  return {
    summary: {
      registeredNodes,
      nodesWithActivity,
      totalWalletOpens: totals.totalWalletOpens,
      totalRewardSol: totals.totalRewardSol,
    },
    nodes,
  };
}
