/** DB registration status. Live ping is not wired yet (Stage 5+). */
export type NodeStatus = "registered" | "inactive";

export type StakingStatus = "active" | "unstake_requested" | "returned";

export interface StakingRecord {
  id: number;
  wallet: string;
  amountSol: number;
  stakedAt: string;
  status: StakingStatus;
  txSignature: string | null;
}

export interface NodeRecord {
  id: number;
  ownerWallet: string;
  nodeId: string;
  nodeName: string | null;
  publicKey: string | null;
  createdAt: string;
  status: NodeStatus;
  referralWalletOpens: number;
  rewardSol: number;
  rewardToken: number;
  latitude: number | null;
  longitude: number | null;
  lastPingAt: string | null;
}

export interface NodeListStats {
  total: number;
  activeRegistered: number;
}

export interface NodeListResponse {
  stats: NodeListStats;
  nodes: NodeRecord[];
}
