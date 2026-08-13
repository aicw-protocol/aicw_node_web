/** Minimum wait after unstake approval before SOL is returned. */
export const UNSTAKE_COOLDOWN_HOURS = 72;

export const UNSTAKE_COOLDOWN_MS = UNSTAKE_COOLDOWN_HOURS * 60 * 60 * 1000;

/** Treat node as still active if pinged within this window. */
export const NODE_ACTIVE_PING_MS = 5 * 60 * 1000;
