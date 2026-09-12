import type { Pool } from "mysql2/promise";

const REWARD_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS reward_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  node_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  wallet_id VARCHAR(128) NULL,
  tx_signature VARCHAR(128) NULL,
  amount_sol DECIMAL(20, 9) NOT NULL DEFAULT 0,
  amount_token DECIMAL(20, 9) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reward_events_node (node_id),
  KEY idx_reward_events_type (event_type),
  KEY idx_reward_events_wallet (wallet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const WITHDRAWALS_TABLE = `
CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  node_id VARCHAR(128) NOT NULL,
  owner_wallet VARCHAR(64) NOT NULL,
  asset ENUM('sol', 'token') NOT NULL,
  amount DECIMAL(20, 9) NOT NULL,
  status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  chain_tx_signature VARCHAR(128) NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_withdrawals_node (node_id),
  KEY idx_withdrawals_owner (owner_wallet),
  KEY idx_withdrawals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function addColumnIfMissing(
  pool: Pool,
  sql: string,
): Promise<void> {
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

export async function ensureRewardSchema(pool: Pool): Promise<void> {
  await pool.query(REWARD_EVENTS_TABLE);
  await pool.query(WITHDRAWALS_TABLE);

  await addColumnIfMissing(
    pool,
    "ALTER TABLE nodes ADD COLUMN withdrawn_sol DECIMAL(20, 9) NOT NULL DEFAULT 0 COMMENT 'SOL already withdrawn to operator'",
  );
  await addColumnIfMissing(
    pool,
    "ALTER TABLE nodes ADD COLUMN withdrawn_token DECIMAL(20, 9) NOT NULL DEFAULT 0 COMMENT 'TAICW already withdrawn to operator'",
  );
  await addColumnIfMissing(
    pool,
    "ALTER TABLE nodes ADD COLUMN committee_wallet_opens INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Wallet issuances where node was in MPC committee'",
  );
}
