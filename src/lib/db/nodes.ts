import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { PublicKey } from "@solana/web3.js";
import { getPool } from "./pool";
import type { NodeListResponse, NodeRecord, NodeStatus } from "./types";

interface NodeRow extends RowDataPacket {
  id: number;
  owner_wallet: string;
  node_id: string;
  node_name: string | null;
  public_key: string | null;
  created_at: Date;
  status: NodeStatus;
  referral_wallet_opens: number;
  reward_sol: string;
  reward_token: string;
  latitude: number | null;
  longitude: number | null;
  last_ping_at: Date | null;
}

const NODE_SELECT =
  `id, owner_wallet, node_id, node_name, public_key, created_at, status,
   referral_wallet_opens, reward_sol, reward_token, latitude, longitude, last_ping_at`;

function mapNode(row: NodeRow): NodeRecord {
  return {
    id: row.id,
    ownerWallet: row.owner_wallet,
    nodeId: row.node_id,
    nodeName: row.node_name,
    publicKey: row.public_key,
    createdAt: row.created_at.toISOString(),
    status: row.status,
    referralWalletOpens: row.referral_wallet_opens,
    rewardSol: Number(row.reward_sol),
    rewardToken: Number(row.reward_token),
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    lastPingAt: row.last_ping_at ? row.last_ping_at.toISOString() : null,
  };
}

const NODE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,127}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const NODE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

export function validateNodeId(nodeId: string): string | null {
  const trimmed = nodeId.trim();
  if (!trimmed) return "Node ID is required";
  if (UUID_PATTERN.test(trimmed)) return null;
  if (!NODE_ID_PATTERN.test(trimmed)) {
    return "Node ID must be a UUID or 3–128 characters (letters, numbers, ., _, -)";
  }
  return null;
}

export function validatePublicKey(publicKey: string): string | null {
  const trimmed = publicKey.trim().toLowerCase();
  if (!trimmed) return "Public key is required";
  if (!PUBLIC_KEY_PATTERN.test(trimmed)) {
    return "Public key must be 64 hex characters (Ed25519)";
  }
  return null;
}

export function validateNodeName(nodeName: string): string | null {
  const trimmed = nodeName.trim();
  if (!trimmed) return "Node name is required";
  if (!NODE_NAME_PATTERN.test(trimmed)) {
    return "Node name must be 2–64 characters (letters, numbers, ., _, -)";
  }
  return null;
}

export function validateOwnerWallet(wallet: string): string | null {
  try {
    new PublicKey(wallet);
    return null;
  } catch {
    return "Invalid wallet address";
  }
}

export async function listNodes(): Promise<NodeListResponse> {
  const pool = await getPool();
  const [rows] = await pool.query<NodeRow[]>(
    `SELECT ${NODE_SELECT} FROM nodes ORDER BY created_at DESC`,
  );

  const nodes = rows.map(mapNode);
  const total = nodes.length;
  const activeRegistered = nodes.filter((n) => n.status === "registered").length;

  return {
    stats: { total, activeRegistered },
    nodes,
  };
}

export async function listNodesByOwner(ownerWallet: string): Promise<NodeRecord[]> {
  const pool = await getPool();
  const [rows] = await pool.query<NodeRow[]>(
    `SELECT ${NODE_SELECT} FROM nodes
     WHERE owner_wallet = :ownerWallet
     ORDER BY created_at DESC`,
    { ownerWallet },
  );
  return rows.map(mapNode);
}

export function validateGeo(
  latitude?: number | null,
  longitude?: number | null,
): string | null {
  if (latitude === undefined || latitude === null) {
    if (longitude === undefined || longitude === null) return null;
    return "latitude and longitude must be provided together";
  }
  if (longitude === undefined || longitude === null) {
    return "latitude and longitude must be provided together";
  }
  if (latitude < -90 || latitude > 90) return "latitude must be between -90 and 90";
  if (longitude < -180 || longitude > 180) {
    return "longitude must be between -180 and 180";
  }
  return null;
}

export async function registerNode(input: {
  ownerWallet: string;
  nodeId: string;
  nodeName?: string | null;
  publicKey?: string | null;
}): Promise<NodeRecord> {
  const nodeIdError = validateNodeId(input.nodeId);
  if (nodeIdError) throw new Error(nodeIdError);

  const walletError = validateOwnerWallet(input.ownerWallet);
  if (walletError) throw new Error(walletError);

  if (input.nodeName) {
    const nameError = validateNodeName(input.nodeName);
    if (nameError) throw new Error(nameError);
  }

  if (input.publicKey) {
    const pkError = validatePublicKey(input.publicKey);
    if (pkError) throw new Error(pkError);
  }

  const pool = await getPool();
  const nodeId = input.nodeId.trim();
  const nodeName = input.nodeName?.trim() || null;
  const publicKey = input.publicKey?.trim().toLowerCase() || null;

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO nodes (owner_wallet, node_id, node_name, public_key, status, latitude, longitude)
       VALUES (:ownerWallet, :nodeId, :nodeName, :publicKey, 'registered', :latitude, :longitude)`,
      {
        ownerWallet: input.ownerWallet,
        nodeId,
        nodeName,
        publicKey,
        latitude: null,
        longitude: null,
      },
    );

    const [rows] = await pool.query<NodeRow[]>(
      `SELECT ${NODE_SELECT} FROM nodes WHERE id = :id`,
      { id: result.insertId },
    );

    if (!rows[0]) {
      throw new Error("Failed to load registered node");
    }

    return mapNode(rows[0]);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      throw new Error("This node ID is already registered");
    }
    throw error;
  }
}

export async function deleteNodeById(id: number): Promise<void> {
  const pool = await getPool();
  await pool.execute("DELETE FROM nodes WHERE id = :id", { id });
}

export async function deleteNodeByOwner(input: {
  nodeId: string;
  ownerWallet: string;
}): Promise<boolean> {
  const nodeIdError = validateNodeId(input.nodeId);
  if (nodeIdError) throw new Error(nodeIdError);

  const walletError = validateOwnerWallet(input.ownerWallet);
  if (walletError) throw new Error(walletError);

  const pool = await getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM nodes
     WHERE node_id = :nodeId
       AND owner_wallet = :ownerWallet`,
    {
      nodeId: input.nodeId.trim(),
      ownerWallet: input.ownerWallet.trim(),
    },
  );

  return result.affectedRows > 0;
}

export async function countRegisteredNodes(): Promise<number> {
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM nodes WHERE status = 'registered'",
  );
  return Number(rows[0]?.total ?? 0);
}
