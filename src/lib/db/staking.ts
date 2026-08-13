import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool } from "./pool";
import type { StakingRecord, StakingStatus } from "./types";
import { UNSTAKE_COOLDOWN_HOURS } from "@/lib/unstakeConstants";

interface StakingRow extends RowDataPacket {
  id: number;
  wallet: string;
  amount_sol: string;
  staked_at: Date;
  status: StakingStatus;
  tx_signature: string | null;
  unstake_requested_at: Date | null;
  return_available_at: Date | null;
  returned_at: Date | null;
  return_tx_signature: string | null;
  last_initiated_node_id: string | null;
  last_initiated_node_name: string | null;
}

const STAKING_SELECT = `
  id, wallet, amount_sol, staked_at, status, tx_signature,
  unstake_requested_at, return_available_at, returned_at, return_tx_signature,
  last_initiated_node_id, last_initiated_node_name
`;

function mapStaking(row: StakingRow): StakingRecord {
  return {
    id: row.id,
    wallet: row.wallet,
    amountSol: Number(row.amount_sol),
    stakedAt: row.staked_at.toISOString(),
    status: row.status,
    txSignature: row.tx_signature,
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

export async function getActiveStakeByWallet(
  wallet: string,
): Promise<StakingRecord | null> {
  const pool = await getPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT}
     FROM staking
     WHERE wallet = :wallet AND status = 'active'
     ORDER BY staked_at DESC
     LIMIT 1`,
    { wallet },
  );
  return rows[0] ? mapStaking(rows[0]) : null;
}

export async function getPendingUnstakeByWallet(
  wallet: string,
): Promise<StakingRecord | null> {
  const pool = await getPool();
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
  const pool = await getPool();
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
  const pool = await getPool();
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
}): Promise<StakingRecord> {
  const pool = await getPool();

  const existingActive = await getActiveStakeByWallet(input.wallet);
  if (existingActive) {
    throw new Error("This wallet already has an active stake");
  }

  const duplicate = await findStakeByTxSignature(input.txSignature);
  if (duplicate) {
    throw new Error("This transaction is already recorded");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO staking (wallet, amount_sol, status, tx_signature)
     VALUES (:wallet, :amountSol, 'active', :txSignature)`,
    {
      wallet: input.wallet,
      amountSol: input.amountSol,
      txSignature: input.txSignature,
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

export async function requestUnstake(wallet: string): Promise<StakingRecord> {
  return requestUnstakeForWallet({ wallet });
}

export async function requestUnstakeForWallet(input: {
  wallet: string;
  nodeId?: string | null;
  nodeName?: string | null;
}): Promise<StakingRecord> {
  const pool = await getPool();
  const active = await getActiveStakeByWallet(input.wallet);
  if (!active) {
    throw new Error("No active stake found for this wallet");
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
      id: active.id,
      nodeId: input.nodeId?.trim() || null,
      nodeName: input.nodeName?.trim() || null,
    },
  );

  const [rows] = await pool.query<StakingRow[]>(
    `SELECT ${STAKING_SELECT} FROM staking WHERE id = :id`,
    { id: active.id },
  );

  if (!rows[0]) {
    throw new Error("Failed to load unstake request");
  }

  return mapStaking(rows[0]);
}

export async function listDueUnstakeReturns(): Promise<StakingRecord[]> {
  const pool = await getPool();
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
  const pool = await getPool();
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
