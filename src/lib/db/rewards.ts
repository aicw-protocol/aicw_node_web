import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { selectCommittee } from "@/lib/committee/selectCommittee";
import {
  SOL_WITHDRAW_MIN,
  TOKEN_REWARD_AMOUNTS,
  WALLET_ISSUANCE_FEE_SOL,
  type MpcRewardEventType,
} from "@/lib/rewardConfig";
import { getPool } from "./pool";
import { ensureRewardSchema } from "./rewardSchema";

interface NodeRewardRow extends RowDataPacket {
  node_id: string;
  owner_wallet: string;
  committee_wallet_opens: number;
  reward_sol: string;
  reward_token: string;
  withdrawn_sol: string;
  withdrawn_token: string;
}

export type NodeRewardBalance = {
  nodeId: string;
  ownerWallet: string;
  committeeWalletOpens: number;
  accruedSol: number;
  withdrawnSol: number;
  availableSol: number;
  accruedToken: number;
  withdrawnToken: number;
  availableToken: number;
};

function mapBalance(row: NodeRewardRow): NodeRewardBalance {
  const accruedSol = Number(row.reward_sol);
  const withdrawnSol = Number(row.withdrawn_sol);
  const accruedToken = Number(row.reward_token);
  const withdrawnToken = Number(row.withdrawn_token);

  return {
    nodeId: row.node_id,
    ownerWallet: row.owner_wallet,
    committeeWalletOpens: row.committee_wallet_opens,
    accruedSol,
    withdrawnSol,
    availableSol: Math.max(0, accruedSol - withdrawnSol),
    accruedToken,
    withdrawnToken,
    availableToken: Math.max(0, accruedToken - withdrawnToken),
  };
}

async function ensureReady(): Promise<void> {
  const pool = await getPool();
  await ensureRewardSchema(pool);
}

export async function listActiveNodeIds(): Promise<string[]> {
  const pool = await getPool();
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT node_id FROM nodes
     WHERE status = 'registered'
       AND last_ping_at IS NOT NULL
       AND last_ping_at >= :cutoff`,
    { cutoff },
  );

  const active = rows.map((r) => String(r.node_id)).filter(Boolean);
  if (active.length > 0) return active;

  const [fallback] = await pool.query<RowDataPacket[]>(
    `SELECT node_id FROM nodes WHERE status = 'registered'`,
  );
  return fallback.map((r) => String(r.node_id)).filter(Boolean);
}

export async function resolveWalletIssuanceCommittee(
  walletId: string,
): Promise<string[]> {
  const activePool = await listActiveNodeIds();
  return selectCommittee(walletId, activePool).nodeIds;
}

export async function recordWalletIssuance(input: {
  walletId: string;
  txSignature?: string;
  aicwWalletPda?: string;
  committeeNodeIds?: string[];
}): Promise<{ committeeNodeIds: string[]; perNodeSol: number }> {
  await ensureReady();
  const pool = await getPool();

  const committeeNodeIds =
    input.committeeNodeIds?.length
      ? input.committeeNodeIds
      : await resolveWalletIssuanceCommittee(input.walletId);

  if (committeeNodeIds.length === 0) {
    throw new Error("No committee nodes for wallet issuance");
  }

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM reward_events
     WHERE wallet_id = :walletId AND event_type = 'wallet_issued'
     LIMIT 1`,
    { walletId: input.walletId },
  );
  if (existing.length > 0) {
    return { committeeNodeIds, perNodeSol: WALLET_ISSUANCE_FEE_SOL / committeeNodeIds.length };
  }

  const perNodeSol = WALLET_ISSUANCE_FEE_SOL / committeeNodeIds.length;

  for (const nodeId of committeeNodeIds) {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE nodes
       SET committee_wallet_opens = committee_wallet_opens + 1,
           reward_sol = reward_sol + :amount
       WHERE node_id = :nodeId AND status = 'registered'`,
      { nodeId, amount: perNodeSol },
    );

    if (result.affectedRows === 0) {
      console.warn(`[rewards] committee node not found: ${nodeId}`);
      continue;
    }

    await pool.execute(
      `INSERT INTO reward_events (node_id, event_type, wallet_id, tx_signature, amount_sol, amount_token)
       VALUES (:nodeId, 'wallet_issued', :walletId, :txSignature, :amountSol, 0)`,
      {
        nodeId,
        walletId: input.walletId,
        txSignature: input.txSignature ?? null,
        amountSol: perNodeSol,
      },
    );
  }

  return { committeeNodeIds, perNodeSol };
}

export async function recordMpcEventForCommittee(input: {
  walletId: string;
  eventType: MpcRewardEventType;
  txSignature?: string;
}): Promise<{ credited: string[]; skipped: string[] }> {
  const committeeNodeIds = await resolveWalletIssuanceCommittee(input.walletId);
  const credited: string[] = [];
  const skipped: string[] = [];

  for (const nodeId of committeeNodeIds) {
    const ok = await recordMpcEvent({
      nodeId,
      eventType: input.eventType,
      walletId: input.walletId,
      txSignature: input.txSignature,
    });
    if (ok) credited.push(nodeId);
    else skipped.push(nodeId);
  }

  return { credited, skipped };
}

export async function recordMpcEvent(input: {
  nodeId: string;
  eventType: MpcRewardEventType;
  walletId?: string;
  txSignature?: string;
}): Promise<boolean> {
  if (input.eventType === ("wallet_issued" as MpcRewardEventType)) {
    return false;
  }

  const amountToken = TOKEN_REWARD_AMOUNTS[input.eventType];
  if (!amountToken) return false;

  await ensureReady();
  const pool = await getPool();

  if (input.txSignature) {
    const [dup] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM reward_events
       WHERE node_id = :nodeId AND event_type = :eventType AND tx_signature = :txSignature
       LIMIT 1`,
      {
        nodeId: input.nodeId,
        eventType: input.eventType,
        txSignature: input.txSignature,
      },
    );
    if (dup.length > 0) return true;
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE nodes
     SET reward_token = reward_token + :amount
     WHERE node_id = :nodeId AND status = 'registered'`,
    { nodeId: input.nodeId, amount: amountToken },
  );

  if (result.affectedRows === 0) return false;

  await pool.execute(
    `INSERT INTO reward_events (node_id, event_type, wallet_id, tx_signature, amount_sol, amount_token)
     VALUES (:nodeId, :eventType, :walletId, :txSignature, 0, :amountToken)`,
    {
      nodeId: input.nodeId,
      eventType: input.eventType,
      walletId: input.walletId ?? null,
      txSignature: input.txSignature ?? null,
      amountToken,
    },
  );

  return true;
}

export async function getNodeBalancesByOwner(
  ownerWallet: string,
): Promise<NodeRewardBalance[]> {
  await ensureReady();
  const pool = await getPool();
  const [rows] = await pool.query<NodeRewardRow[]>(
    `SELECT node_id, owner_wallet, committee_wallet_opens,
            reward_sol, reward_token, withdrawn_sol, withdrawn_token
     FROM nodes
     WHERE owner_wallet = :owner AND status = 'registered'`,
    { owner: ownerWallet },
  );
  return rows.map(mapBalance);
}

export async function getNetworkRewardSummary(): Promise<{
  registeredNodes: number;
  committeeWalletOpens: number;
  totalAccruedSol: number;
  totalAccruedToken: number;
  totalAvailableSol: number;
  totalAvailableToken: number;
}> {
  await ensureReady();
  const pool = await getPool();

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM nodes WHERE status = 'registered'`,
  );

  const [rows] = await pool.query<NodeRewardRow[]>(
    `SELECT node_id, owner_wallet, committee_wallet_opens,
            reward_sol, reward_token, withdrawn_sol, withdrawn_token
     FROM nodes WHERE status = 'registered'`,
  );

  const balances = rows.map(mapBalance);
  const totals = balances.reduce(
    (acc, b) => ({
      committeeWalletOpens: acc.committeeWalletOpens + b.committeeWalletOpens,
      totalAccruedSol: acc.totalAccruedSol + b.accruedSol,
      totalAccruedToken: acc.totalAccruedToken + b.accruedToken,
      totalAvailableSol: acc.totalAvailableSol + b.availableSol,
      totalAvailableToken: acc.totalAvailableToken + b.availableToken,
    }),
    {
      committeeWalletOpens: 0,
      totalAccruedSol: 0,
      totalAccruedToken: 0,
      totalAvailableSol: 0,
      totalAvailableToken: 0,
    },
  );

  return {
    registeredNodes: Number(countRows[0]?.total ?? 0),
    ...totals,
  };
}

export async function previewSolWithdrawal(input: {
  ownerWallet: string;
  nodeId?: string;
}): Promise<{ amountSol: number; allocations: { nodeId: string; amount: number }[] }> {
  const balances = await getNodeBalancesByOwner(input.ownerWallet);
  const targets = input.nodeId
    ? balances.filter((b) => b.nodeId === input.nodeId)
    : balances;

  const allocations = targets
    .filter((b) => b.availableSol > 0)
    .map((b) => ({ nodeId: b.nodeId, amount: b.availableSol }));

  const amountSol = allocations.reduce((s, a) => s + a.amount, 0);
  if (amountSol < SOL_WITHDRAW_MIN) {
    throw new Error(
      `Minimum SOL withdraw is ${SOL_WITHDRAW_MIN}. Available: ${amountSol}`,
    );
  }

  return { amountSol, allocations };
}

export async function finalizeSolWithdrawal(input: {
  ownerWallet: string;
  allocations: { nodeId: string; amount: number }[];
  chainTxSignature: string;
}): Promise<number> {
  await ensureReady();
  const pool = await getPool();
  const total = input.allocations.reduce((s, a) => s + a.amount, 0);

  const [insert] = await pool.execute<ResultSetHeader>(
    `INSERT INTO withdrawals (node_id, owner_wallet, asset, amount, status, chain_tx_signature, completed_at)
     VALUES (:nodeId, :owner, 'sol', :amount, 'completed', :sig, UTC_TIMESTAMP())`,
    {
      nodeId:
        input.allocations.length === 1 ? input.allocations[0]!.nodeId : "aggregate",
      owner: input.ownerWallet,
      amount: total,
      sig: input.chainTxSignature,
    },
  );

  for (const row of input.allocations) {
    await pool.execute(
      `UPDATE nodes SET withdrawn_sol = withdrawn_sol + :amount
       WHERE node_id = :nodeId AND owner_wallet = :owner AND status = 'registered'`,
      { amount: row.amount, nodeId: row.nodeId, owner: input.ownerWallet },
    );
  }

  return Number(insert.insertId);
}

export async function previewTokenWithdrawal(input: {
  ownerWallet: string;
  nodeId?: string;
  amount?: number;
}): Promise<{ amountToken: number; allocations: { nodeId: string; amount: number }[] }> {
  const balances = await getNodeBalancesByOwner(input.ownerWallet);
  const targets = input.nodeId
    ? balances.filter((b) => b.nodeId === input.nodeId)
    : balances;

  const totalAvailable = targets.reduce((s, b) => s + b.availableToken, 0);
  const amountToken =
    input.amount != null
      ? Math.min(input.amount, totalAvailable)
      : totalAvailable;

  if (amountToken <= 0) {
    throw new Error("No TAICW available to withdraw");
  }

  const allocations: { nodeId: string; amount: number }[] = [];
  let remaining = amountToken;
  for (const b of targets) {
    if (remaining <= 0) break;
    const take = Math.min(b.availableToken, remaining);
    if (take <= 0) continue;
    allocations.push({ nodeId: b.nodeId, amount: take });
    remaining -= take;
  }

  return { amountToken, allocations };
}

export async function finalizeTokenWithdrawal(input: {
  ownerWallet: string;
  allocations: { nodeId: string; amount: number }[];
  chainTxSignature: string;
}): Promise<number> {
  await ensureReady();
  const pool = await getPool();
  const total = input.allocations.reduce((s, a) => s + a.amount, 0);

  const [insert] = await pool.execute<ResultSetHeader>(
    `INSERT INTO withdrawals (node_id, owner_wallet, asset, amount, status, chain_tx_signature, completed_at)
     VALUES (:nodeId, :owner, 'token', :amount, 'completed', :sig, UTC_TIMESTAMP())`,
    {
      nodeId:
        input.allocations.length === 1 ? input.allocations[0]!.nodeId : "aggregate",
      owner: input.ownerWallet,
      amount: total,
      sig: input.chainTxSignature,
    },
  );

  for (const row of input.allocations) {
    await pool.execute(
      `UPDATE nodes SET withdrawn_token = withdrawn_token + :amount
       WHERE node_id = :nodeId AND owner_wallet = :owner AND status = 'registered'`,
      { amount: row.amount, nodeId: row.nodeId, owner: input.ownerWallet },
    );
  }

  return Number(insert.insertId);
}

export async function markWithdrawalCompleted(
  withdrawalId: number,
  chainTxSignature: string,
): Promise<void> {
  const pool = await getPool();
  await pool.execute(
    `UPDATE withdrawals
     SET status = 'completed', chain_tx_signature = :sig, completed_at = UTC_TIMESTAMP()
     WHERE id = :id`,
    { sig: chainTxSignature, id: withdrawalId },
  );
}

export async function markWithdrawalFailed(
  withdrawalId: number,
  errorMessage: string,
): Promise<void> {
  const pool = await getPool();
  await pool.execute(
    `UPDATE withdrawals
     SET status = 'failed', error_message = :msg, completed_at = UTC_TIMESTAMP()
     WHERE id = :id`,
    { msg: errorMessage.slice(0, 2000), id: withdrawalId },
  );
}
