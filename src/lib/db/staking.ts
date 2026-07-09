import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool } from "./pool";
import type { StakingRecord, StakingStatus } from "./types";

interface StakingRow extends RowDataPacket {
  id: number;
  wallet: string;
  amount_sol: string;
  staked_at: Date;
  status: StakingStatus;
  tx_signature: string | null;
}

function mapStaking(row: StakingRow): StakingRecord {
  return {
    id: row.id,
    wallet: row.wallet,
    amountSol: Number(row.amount_sol),
    stakedAt: row.staked_at.toISOString(),
    status: row.status,
    txSignature: row.tx_signature,
  };
}

export async function getActiveStakeByWallet(
  wallet: string,
): Promise<StakingRecord | null> {
  const pool = await getPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT id, wallet, amount_sol, staked_at, status, tx_signature
     FROM staking
     WHERE wallet = :wallet AND status = 'active'
     ORDER BY staked_at DESC
     LIMIT 1`,
    { wallet },
  );
  return rows[0] ? mapStaking(rows[0]) : null;
}

export async function listStakesByWallet(wallet: string): Promise<StakingRecord[]> {
  const pool = await getPool();
  const [rows] = await pool.query<StakingRow[]>(
    `SELECT id, wallet, amount_sol, staked_at, status, tx_signature
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
    `SELECT id, wallet, amount_sol, staked_at, status, tx_signature
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
    `SELECT id, wallet, amount_sol, staked_at, status, tx_signature
     FROM staking WHERE id = :id`,
    { id: result.insertId },
  );

  if (!rows[0]) {
    throw new Error("Failed to load staking record");
  }

  return mapStaking(rows[0]);
}

export async function requestUnstake(wallet: string): Promise<StakingRecord> {
  const pool = await getPool();
  const active = await getActiveStakeByWallet(wallet);
  if (!active) {
    throw new Error("No active stake found for this wallet");
  }

  await pool.execute(
    `UPDATE staking SET status = 'unstake_requested' WHERE id = :id`,
    { id: active.id },
  );

  const [rows] = await pool.query<StakingRow[]>(
    `SELECT id, wallet, amount_sol, staked_at, status, tx_signature
     FROM staking WHERE id = :id`,
    { id: active.id },
  );

  if (!rows[0]) {
    throw new Error("Failed to load unstake request");
  }

  return mapStaking(rows[0]);
}
