/** Minimum wait after unstake approval before SOL is returned. */
const DEFAULT_UNSTAKE_COOLDOWN_HOURS = 72;

function parseUnstakeCooldownHours(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_UNSTAKE_COOLDOWN_HOURS;
  }

  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_UNSTAKE_COOLDOWN_HOURS;
  }

  return parsed;
}

export const UNSTAKE_COOLDOWN_HOURS = parseUnstakeCooldownHours(
  process.env.NEXT_PUBLIC_UNSTAKE_COOLDOWN_HOURS ??
    process.env.UNSTAKE_COOLDOWN_HOURS,
);

export const UNSTAKE_COOLDOWN_MS = UNSTAKE_COOLDOWN_HOURS * 60 * 60 * 1000;

export function isImmediateUnstakeReturn(): boolean {
  return UNSTAKE_COOLDOWN_HOURS <= 0;
}

export function formatUnstakeReturnWait(): string {
  if (isImmediateUnstakeReturn()) {
    return "immediately";
  }

  return `${UNSTAKE_COOLDOWN_HOURS} hours`;
}

export function formatUnstakeReturnWaitShort(): string {
  if (isImmediateUnstakeReturn()) {
    return "immediately";
  }

  return `after ${UNSTAKE_COOLDOWN_HOURS}h`;
}

/** Treat node as still active if pinged within this window. */
export const NODE_ACTIVE_PING_MS = 5 * 60 * 1000;
