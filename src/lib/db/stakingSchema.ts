import type { Pool } from "mysql2/promise";

async function addColumnIfMissing(pool: Pool, sql: string): Promise<void> {
  try {
    await pool.query(sql);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_FIELDNAME"
    ) {
      return;
    }
    throw error;
  }
}

async function addIndexIfMissing(pool: Pool, sql: string): Promise<void> {
  try {
    await pool.query(sql);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_KEYNAME"
    ) {
      return;
    }
    throw error;
  }
}

let schemaReady: Promise<void> | null = null;

export async function ensureStakingSchema(pool: Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const columns = [
        "ALTER TABLE staking ADD COLUMN unstake_requested_at TIMESTAMP NULL COMMENT 'When unstake was approved'",
        "ALTER TABLE staking ADD COLUMN return_available_at TIMESTAMP NULL COMMENT 'Earliest time SOL may be returned'",
        "ALTER TABLE staking ADD COLUMN returned_at TIMESTAMP NULL COMMENT 'When SOL was returned to operator wallet'",
        "ALTER TABLE staking ADD COLUMN return_tx_signature VARCHAR(128) NULL COMMENT 'Solana tx sending stake back to operator'",
        "ALTER TABLE staking ADD COLUMN last_initiated_node_id VARCHAR(128) NULL COMMENT 'Last node that triggered unstake'",
        "ALTER TABLE staking ADD COLUMN last_initiated_node_name VARCHAR(64) NULL COMMENT 'Last node name that triggered unstake'",
        "ALTER TABLE staking ADD COLUMN bound_node_id VARCHAR(128) NULL COMMENT 'Node this stake secures after registration'",
        "ALTER TABLE staking ADD COLUMN curve_registered_count_at_stake INT UNSIGNED NULL COMMENT 'Global registered node count when stake was recorded'",
      ];

      for (const sql of columns) {
        await addColumnIfMissing(pool, sql);
      }

      await addIndexIfMissing(
        pool,
        "ALTER TABLE staking ADD KEY idx_staking_bound_node (bound_node_id)",
      );
    })();
  }

  await schemaReady;
}
