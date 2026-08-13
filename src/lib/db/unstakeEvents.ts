import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getPool } from "./pool";

export type UnstakeEventType =
  | "node_offboard_started"
  | "node_stopped"
  | "node_deregistered"
  | "unstake_requested"
  | "return_scheduled"
  | "return_sent"
  | "return_failed"
  | "local_identity_removed";

export interface UnstakeEvent {
  id: number;
  stakingId: number | null;
  wallet: string;
  nodeId: string | null;
  nodeName: string | null;
  eventType: UnstakeEventType;
  detail: string | null;
  createdAt: string;
}

interface UnstakeEventRow extends RowDataPacket {
  id: number;
  staking_id: number | null;
  wallet: string;
  node_id: string | null;
  node_name: string | null;
  event_type: UnstakeEventType;
  detail: string | null;
  created_at: Date;
}

function mapEvent(row: UnstakeEventRow): UnstakeEvent {
  return {
    id: row.id,
    stakingId: row.staking_id,
    wallet: row.wallet,
    nodeId: row.node_id,
    nodeName: row.node_name,
    eventType: row.event_type,
    detail: row.detail,
    createdAt: row.created_at.toISOString(),
  };
}

export async function logUnstakeEvent(input: {
  stakingId?: number | null;
  wallet: string;
  nodeId?: string | null;
  nodeName?: string | null;
  eventType: UnstakeEventType;
  detail?: string | null;
}): Promise<UnstakeEvent> {
  const pool = await getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO unstake_events
      (staking_id, wallet, node_id, node_name, event_type, detail)
     VALUES (:stakingId, :wallet, :nodeId, :nodeName, :eventType, :detail)`,
    {
      stakingId: input.stakingId ?? null,
      wallet: input.wallet.trim(),
      nodeId: input.nodeId?.trim() || null,
      nodeName: input.nodeName?.trim() || null,
      eventType: input.eventType,
      detail: input.detail ?? null,
    },
  );

  const [rows] = await pool.query<UnstakeEventRow[]>(
    `SELECT id, staking_id, wallet, node_id, node_name, event_type, detail, created_at
     FROM unstake_events WHERE id = :id`,
    { id: result.insertId },
  );

  if (!rows[0]) {
    throw new Error("Failed to load unstake event");
  }

  return mapEvent(rows[0]);
}

export async function listUnstakeEventsByWallet(
  wallet: string,
  limit = 50,
): Promise<UnstakeEvent[]> {
  const pool = await getPool();
  const [rows] = await pool.query<UnstakeEventRow[]>(
    `SELECT id, staking_id, wallet, node_id, node_name, event_type, detail, created_at
     FROM unstake_events
     WHERE wallet = :wallet
     ORDER BY created_at DESC
     LIMIT :limit`,
    { wallet: wallet.trim(), limit },
  );
  return rows.map(mapEvent);
}
