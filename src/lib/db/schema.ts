import type { Pool } from "mysql2/promise";

const NODES_TABLE = `
CREATE TABLE IF NOT EXISTS nodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_wallet VARCHAR(64) NOT NULL,
  node_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('registered', 'inactive') NOT NULL DEFAULT 'registered',
  referral_wallet_opens INT UNSIGNED NOT NULL DEFAULT 0,
  reward_sol DECIMAL(20, 9) NOT NULL DEFAULT 0,
  reward_token DECIMAL(20, 9) NOT NULL DEFAULT 0,
  contract_stake_ref VARCHAR(128) NULL COMMENT 'Future on-chain stake reference',
  last_ping_at TIMESTAMP NULL COMMENT 'Last time this node pinged in as alive',
  latitude DECIMAL(9, 6) NULL COMMENT 'Operator location for map display',
  longitude DECIMAL(9, 6) NULL COMMENT 'Operator location for map display',
  PRIMARY KEY (id),
  UNIQUE KEY uq_nodes_node_id (node_id),
  KEY idx_nodes_owner_wallet (owner_wallet),
  KEY idx_nodes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const STAKING_TABLE = `
CREATE TABLE IF NOT EXISTS staking (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wallet VARCHAR(64) NOT NULL,
  amount_sol DECIMAL(20, 9) NOT NULL,
  staked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'unstake_requested', 'returned') NOT NULL DEFAULT 'active',
  tx_signature VARCHAR(128) NULL,
  contract_stake_ref VARCHAR(128) NULL COMMENT 'Future on-chain stake reference',
  PRIMARY KEY (id),
  KEY idx_staking_wallet (wallet),
  KEY idx_staking_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

let schemaReady: Promise<void> | null = null;

async function ensureNodeGeoColumns(pool: Pool): Promise<void> {
  const alters = [
    "ALTER TABLE nodes ADD COLUMN latitude DECIMAL(9, 6) NULL COMMENT 'Operator location for map display'",
    "ALTER TABLE nodes ADD COLUMN longitude DECIMAL(9, 6) NULL COMMENT 'Operator location for map display'",
  ];

  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ER_DUP_FIELDNAME"
      ) {
        continue;
      }
      throw error;
    }
  }
}

async function ensureNodeOnboardingColumns(pool: Pool): Promise<void> {
  const alters = [
    "ALTER TABLE nodes ADD COLUMN node_name VARCHAR(64) NULL COMMENT 'Operator-chosen node name from identity'",
    "ALTER TABLE nodes ADD COLUMN public_key VARCHAR(128) NULL COMMENT 'Ed25519 public key hex (never store private key)'",
  ];

  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ER_DUP_FIELDNAME"
      ) {
        continue;
      }
      throw error;
    }
  }
}

async function ensureNodePingColumn(pool: Pool): Promise<void> {
  // Migrate the legacy `last_heartbeat_at` column (renamed to `last_ping_at`).
  try {
    await pool.query(
      "ALTER TABLE nodes CHANGE COLUMN last_heartbeat_at last_ping_at TIMESTAMP NULL COMMENT 'Last time this node pinged in as alive'",
    );
    return;
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "ER_BAD_FIELD_ERROR" || error.code === "ER_DUP_FIELDNAME")
      )
    ) {
      throw error;
    }
  }

  try {
    await pool.query(
      "ALTER TABLE nodes ADD COLUMN last_ping_at TIMESTAMP NULL COMMENT 'Last time this node pinged in as alive'",
    );
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

export async function ensureSchema(pool: Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(NODES_TABLE);
      await pool.query(STAKING_TABLE);
      await ensureNodeGeoColumns(pool);
      await ensureNodePingColumn(pool);
      await ensureNodeOnboardingColumns(pool);
    })();
  }
  await schemaReady;
}
