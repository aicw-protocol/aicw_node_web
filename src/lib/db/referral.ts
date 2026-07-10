import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool } from "./pool";
import { PING_MAX_AGE_MS } from "../referralConfig";

interface ActiveNodeRow extends RowDataPacket {
  id: number;
  node_id: string;
  owner_wallet: string;
}

export interface ReferralNode {
  nodeId: string;
  ownerWallet: string;
}

/**
 * Select a random active node for referral.
 * 
 * Selection criteria:
 * - status = 'registered'
 * - last_ping_at within PING_MAX_AGE_MS
 * 
 * Future enhancement: Add reputation-based weighting here.
 * 
 * @returns The selected node or null if no active nodes available.
 */
export async function selectReferralNode(): Promise<ReferralNode | null> {
  const pool = await getPool();
  
  const maxAgeSeconds = Math.floor(PING_MAX_AGE_MS / 1000);
  
  // Select active nodes with a recent ping
  // For now, ping may not be implemented yet, so we also include
  // nodes without a ping for testing purposes during early development.
  // TODO: Enforce the ping requirement once nodes start pinging in.
  const [rows] = await pool.query<ActiveNodeRow[]>(
    `SELECT id, node_id, owner_wallet
     FROM nodes
     WHERE status = 'registered'
       AND (
         last_ping_at IS NOT NULL 
         AND last_ping_at >= DATE_SUB(NOW(), INTERVAL :maxAgeSeconds SECOND)
       )
     ORDER BY RAND()
     LIMIT 1`,
    { maxAgeSeconds },
  );

  if (rows.length > 0) {
    return {
      nodeId: rows[0].node_id,
      ownerWallet: rows[0].owner_wallet,
    };
  }

  // Fallback: If no nodes have pinged in, select from all registered nodes.
  // This is for the transition period while pinging is being rolled out.
  // Remove this fallback once all nodes are pinging in.
  const [fallbackRows] = await pool.query<ActiveNodeRow[]>(
    `SELECT id, node_id, owner_wallet
     FROM nodes
     WHERE status = 'registered'
     ORDER BY RAND()
     LIMIT 1`,
  );

  if (fallbackRows.length > 0) {
    return {
      nodeId: fallbackRows[0].node_id,
      ownerWallet: fallbackRows[0].owner_wallet,
    };
  }

  return null;
}

/**
 * Record a wallet open referral.
 * Increments referral_wallet_opens and adds to reward_sol for the node.
 * 
 * @param nodeId - The node that referred this wallet issuance.
 * @param rewardSol - The SOL reward amount (typically 0.001).
 * @param txSignature - Optional transaction signature for auditing.
 * @param aicwWalletPda - Optional AICW wallet PDA that was created.
 * @returns True if the record was updated, false if node not found.
 */
export async function recordWalletOpen(input: {
  nodeId: string;
  rewardSol: number;
  txSignature?: string;
  aicwWalletPda?: string;
}): Promise<boolean> {
  const pool = await getPool();
  
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE nodes
     SET referral_wallet_opens = referral_wallet_opens + 1,
         reward_sol = reward_sol + :rewardSol
     WHERE node_id = :nodeId
       AND status = 'registered'`,
    {
      nodeId: input.nodeId,
      rewardSol: input.rewardSol,
    },
  );

  return result.affectedRows > 0;
}

/**
 * Get the total number of active nodes (those with a recent ping).
 * Used to check if referral is available.
 */
export async function countActiveNodes(): Promise<number> {
  const pool = await getPool();
  
  const maxAgeSeconds = Math.floor(PING_MAX_AGE_MS / 1000);
  
  // Count nodes with a recent ping
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM nodes
     WHERE status = 'registered'
       AND (
         last_ping_at IS NOT NULL 
         AND last_ping_at >= DATE_SUB(NOW(), INTERVAL :maxAgeSeconds SECOND)
       )`,
    { maxAgeSeconds },
  );

  const withPing = Number(rows[0]?.total ?? 0);
  
  if (withPing > 0) {
    return withPing;
  }

  // Fallback count for transition period
  const [fallbackRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM nodes
     WHERE status = 'registered'`,
  );

  return Number(fallbackRows[0]?.total ?? 0);
}

export interface NodePingGeo {
  latitude: number;
  longitude: number;
}

/**
 * Update a node's last-ping timestamp (and optional GeoIP location).
 * Called by nodes to signal they are alive.
 */
export async function updateNodePing(
  nodeId: string,
  geo?: NodePingGeo | null,
): Promise<boolean> {
  const pool = await getPool();

  if (geo) {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE nodes
       SET last_ping_at = UTC_TIMESTAMP(),
           latitude = :latitude,
           longitude = :longitude
       WHERE node_id = :nodeId
         AND status = 'registered'`,
      {
        nodeId,
        latitude: geo.latitude,
        longitude: geo.longitude,
      },
    );

    return result.affectedRows > 0;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE nodes
     SET last_ping_at = UTC_TIMESTAMP()
     WHERE node_id = :nodeId
       AND status = 'registered'`,
    { nodeId },
  );

  return result.affectedRows > 0;
}
