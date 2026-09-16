import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { Pool } from "mysql2/promise";
import { getPool } from "./pool";
import { ensureStakingSchema } from "./stakingSchema";
import type { StakingRecord, StakingStatus } from "./types";
import { UNSTAKE_COOLDOWN_HOURS } from "@/lib/unstakeConstants";

interface StakingRow extends RowDataPacket {
  id: number;
  wallet: string;
  amount_sol: string;
  staked_at: Date;
  status: StakingStatus;
  tx_signature: string | null;
  bound_node_id: string | null;
  curve_registered_count_at_stake: number | null;
  unstake_requested_at: Date | null;
  return_available_at: Date | null;
  returned_at: Date | null;
  return_tx_signature: string | null;
  last_initiated_node_id: string | null;
  last_initiated_node_name: string | null;
}

const STAKING_SELECT = `
  id, wallet, amount_sol, staked_at, status, tx_signature,
  bound_node_id, curve_registered_count_at_stake,
  unstake_requested_at, return_available_at, returned_at, return_tx_signature,
  last_initiated_node_id, last_initiated_node_name
`;

async function getStakingPool(): Promise<Pool> {
  const pool = await getStakingPool();
  await ensureStakingSchema(pool);
  return pool;
}

function mapStaking(row: StakingRow): StakingRecord {
  return {
    id: row.id,
    wallet: row.wallet,
    amountSol: Number(row.amount_sol),
    stakedAt: row.staked_at.toISOString(),
    status: row.status,
    txSignature: row.tx_signature,
    boundNodeId: row.bound_node_id,
    curveRegisteredCountAtStake: row.curve_registered_count_at_stake,
    unstakeRequestedAt: row.unstake_requested_at
      ? row.unstake_requested_at.toISOString()
      : null,
    returnAvailableAt: row.return_available_at
      ? row.return_available_at.toISOString()
      : null,
    returnedAt: row.returned_at ? row.returned_at.toISOString() : null,
    returnTxSignature: row.return_tx_signature,
    lastInitiatedNodeId: row.last_initiated_node_id,
    lastInitiatedNodeName: row.last_initiated_node_name,
  };
}

export async function listActiveStakesByWallet(
  wallet: string,
): Promise<StakingRecord[]> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE wallet = :wallet AND status = 'active'
     ORDER BY staked_at ASC`,
    { wallet },
  );
  return rows.map(mapStaking);
}

export async function listUnboundActiveStakesByWallet(
  wallet: string,
): Promise<StakingRecord[]> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE wallet = :wallet
       AND status = 'active'
       AND bound_node_id IS NULL
     ORDER BY staked_at ASC`,
    { wallet },
  );
  return rows.map(mapStaking);
}

export async function countUnboundActiveStakes(wallet: string): Promise<number> {
  const stakes = await listUnboundActiveStakesByWallet(wallet);
  return stakes.length;
}

/** @deprecated Prefer listActiveStakesByWallet — kept for callers expecting one record. */
export async function getActiveStakeByWallet(
  wallet: string,
): Promise<StakingRecord | null> {
  const stakes = await listActiveStakesByWallet(wallet);
  return stakes[0] ?? null;
}

export async function getActiveStakeByBoundNodeId(
  nodeId: string,
): Promise<StakingRecord | null> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE bound_node_id = :nodeId AND status = 'active'
     LIMIT 1`,
    { nodeId },
  );
  return rows[0] ? mapStaking(rows[0]) : null;
}

export async function getPendingUnstakeByWallet(
  wallet: string,
): Promise<StakingRecord | null> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE wallet = :wallet AND status = 'unstake_requested'
     ORDER BY unstake_requested_at DESC
     LIMIT 1`,
    { wallet },
  );
  return rows[0] ? mapStaking(rows[0]) : null;
}

export async function listStakesByWallet(wallet: string): Promise<StakingRecord[]> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE wallet = :wallet
     ORDER BY staked_at DESC`,
    { wallet },
  );
  return rows.map(mapStaking);
}

export async function findStakeByTxSignature(
  txSignature: string,
): Promise<StakingRecord | null> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking WHERE tx_signature = :txSignature LIMIT 1`,
    { txSignature },
  );
  return rows[0] ? mapStaking(rows[0]) : null;
}

export async function createStake(input: {
  wallet: string;
  amountSol: number;
  txSignature: string;
  curveRegisteredCountAtStake: number;
}): Promise<StakingRecord> {
  const pool = await getStakingPool();

  const duplicate = await findStakeByTxSignature(input.txSignature);
  if (duplicate) {
    throw new Error("This transaction is already recorded");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO staking (
       wallet, amount_sol, status, tx_signature, curve_registered_count_at_stake
     )
     VALUES (:wallet, :amountSol, 'active', :txSignature, :curveRegisteredCountAtStake)`,
    {
      wallet: input.wallet,
      amountSol: input.amountSol,
      txSignature: input.txSignature,
      curveRegisteredCountAtStake: input.curveRegisteredCountAtStake,
    },
  );

  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT} FROM staking WHERE id = :id`,
    { id: result.insertId },
  );

  if (!rows[0]) {
    throw new Error("Failed to load staking record");
  }

  return mapStaking(rows[0]);
}

export async function bindOldestUnboundStakeToNode(input: {
  wallet: string;
  nodeId: string;
}): Promise<StakingRecord> {
  const pool = await getStakingPool();
  const unbound = await listUnboundActiveStakesByWallet(input.wallet);
  const stake = unbound[0];
  if (!stake) {
    throw new Error(
      "No unbound active stake found. Stake on the Staking page before registering a node.",
    );
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE staking
     SET bound_node_id = :nodeId
     WHERE id = :id
       AND wallet = :wallet
       AND status = 'active'
       AND bound_node_id IS NULL`,
    {
      id: stake.id,
      wallet: input.wallet,
      nodeId: input.nodeId,
    },
  );

  if (result.affectedRows !== 1) {
    throw new Error("Failed to bind stake to node");
  }

  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT} FROM staking WHERE id = :id`,
    { id: stake.id },
  );

  if (!rows[0]) {
    throw new Error("Failed to load bound stake");
  }

  return mapStaking(rows[0]);
}

export async function requestUnstakeForStake(input: {
  stakeId: number;
  wallet: string;
  nodeId?: string | null;
  nodeName?: string | null;
}): Promise<StakingRecord> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE id = :id AND wallet = :wallet AND status = 'active'
     LIMIT 1`,
    { id: input.stakeId, wallet: input.wallet },
  );

  const stake = rows[0];
  if (!stake) {
    throw new Error("No active stake found for this request");
  }

  if (stake.bound_node_id && input.nodeId && stake.bound_node_id !== input.nodeId) {
    throw new Error("Stake is bound to a different node");
  }

  if (stake.bound_node_id && !input.nodeId) {
    throw new Error(
      "This stake is bound to a node. Remove the node to return its stake.",
    );
  }

  await pool.execute(
    `UPDATE staking
     SET status = 'unstake_requested',
         unstake_requested_at = NOW(),
         return_available_at = DATE_ADD(NOW(), INTERVAL ${UNSTAKE_COOLDOWN_HOURS} HOUR),
         last_initiated_node_id = :nodeId,
         last_initiated_node_name = :nodeName
     WHERE id = :id`,
    {
      id: stake.id,
      nodeId: input.nodeId?.trim() || stake.bound_node_id || null,
      nodeName: input.nodeName?.trim() || null,
    },
  );

  const [updated] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT} FROM staking WHERE id = :id`,
    { id: stake.id },
  );

  if (!updated[0]) {
    throw new Error("Failed to load unstake request");
  }

  return mapStaking(updated[0]);
}

export async function requestUnstakeForWallet(input: {
  wallet: string;
  nodeId?: string | null;
  nodeName?: string | null;
  stakeId?: number | null;
}): Promise<StakingRecord> {
  if (input.stakeId != null) {
    return requestUnstakeForStake({
      stakeId: input.stakeId,
      wallet: input.wallet,
      nodeId: input.nodeId,
      nodeName: input.nodeName,
    });
  }

  const unbound = await listUnboundActiveStakesByWallet(input.wallet);
  const stake = unbound[0];
  if (!stake) {
    throw new Error(
      "No unbound active stake found. Bound stakes are returned when you remove their node.",
    );
  }

  return requestUnstakeForStake({
    stakeId: stake.id,
    wallet: input.wallet,
    nodeId: input.nodeId,
    nodeName: input.nodeName,
  });
}

export async function listDueUnstakeReturns(): Promise<StakingRecord[]> {
  const pool = await getStakingPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE status = 'unstake_requested'
       AND return_available_at IS NOT NULL
       AND return_available_at <= NOW()
     ORDER BY return_available_at ASC`,
  );
  return rows.map(mapStaking);
}

export async function markStakeReturned(input: {
  stakeId: number;
  returnTxSignature: string;
}): Promise<StakingRecord> {
  const pool = await getStakingPool();
  await pool.execute(
    `UPDATE staking
     SET status = 'returned',
         returned_at = NOW(),
         return_tx_signature = :returnTxSignature
     WHERE id = :id AND status = 'unstake_requested'`,
    {
      id: input.stakeId,
      returnTxSignature: input.returnTxSignature,
    },
  );

  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT} FROM staking WHERE id = :id`,
    { id: input.stakeId },
  );

  if (!rows[0]) {
    throw new Error("Failed to load returned stake");
  }

  return mapStaking(rows[0]);
}

/** Legacy alias */
export async function requestUnstake(wallet: string): Promise<StakingRecord> {
  return requestUnstakeForWallet({ wallet });
}
