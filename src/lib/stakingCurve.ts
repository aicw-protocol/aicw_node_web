/** Nodes 1–30 require 0 SOL stake. */
export const FREE_NODE_THRESHOLD = 30;

/** Stake at node 31 (SOL) before exponential multiplier. */
export const STAKE_BASE_SOL = 0.002;

/** Exponential growth rate per node after the free tier (node 31 = base only). */
export const STAKE_EXP_GROWTH_RATE = 0.015;

const LAMPORTS_PER_SOL = 1_000_000_000;

export interface CurvePoint {
  nodeCount: number;
  requiredStakeSol: number;
}

/**
 * Required stake (SOL) to register the next node when `registeredNodeCount`
 * nodes already exist in the DB.
 *
 * Curve: nodes 1–30 → 0 SOL; from node 31 → 0.002 × e^(rate × (n − 31)).
 */
export function requiredStakeSol(registeredNodeCount: number): number {
  if (!Number.isFinite(registeredNodeCount) || registeredNodeCount < 0) {
    throw new Error("registeredNodeCount must be a non-negative number");
  }

  const nextNodeNumber = registeredNodeCount + 1;
  if (nextNodeNumber <= FREE_NODE_THRESHOLD) {
    return 0;
  }

  const stepsAfterFree = nextNodeNumber - FREE_NODE_THRESHOLD;
  const exponent = STAKE_EXP_GROWTH_RATE * (stepsAfterFree - 1);
  return STAKE_BASE_SOL * Math.exp(exponent);
}

export function buildCurvePoints(maxNodeCount: number): CurvePoint[] {
  const max = Math.max(0, Math.floor(maxNodeCount));
  const points: CurvePoint[] = [];
  for (let nodeCount = 0; nodeCount <= max; nodeCount += 1) {
    points.push({
      nodeCount,
      requiredStakeSol: requiredStakeSol(nodeCount),
    });
  }
  return points;
}

export function lamportsFromSol(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function solFromLamports(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/** Compare on-chain amounts with small tolerance for floating-point display. */
export function meetsMinimumStake(actualSol: number, requiredSol: number): boolean {
  if (requiredSol <= 0) return true;
  return actualSol + 1e-9 >= requiredSol;
}

export function formatStakeSol(sol: number): string {
  if (sol === 0) return "0.00";
  if (sol < 0.01) return sol.toFixed(4);
  return sol.toFixed(3);
}
