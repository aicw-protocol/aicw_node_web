import { createHash } from "node:crypto";

/** Mirrors aicw_node/pkg/committee DefaultPolicy(). */
export type Tier = {
  maxActive: number;
  committeeSize: number;
  spare: number;
};

export type CommitteePolicy = {
  version: string;
  cap: number;
  mpcThreshold: number;
  tiers: Tier[];
};

export type CommitteePlan = {
  nodeIds: string[];
  threshold: number;
  spare: number;
  committeeSize: number;
};

export function defaultCommitteePolicy(): CommitteePolicy {
  return {
    version: "2",
    cap: 7,
    mpcThreshold: 2,
    tiers: [
      { maxActive: 4, committeeSize: 3, spare: 0 },
      { maxActive: 10, committeeSize: 4, spare: 1 },
      { maxActive: 30, committeeSize: 5, spare: 2 },
      { maxActive: 100, committeeSize: 6, spare: 3 },
      { maxActive: 999_999, committeeSize: 7, spare: 4 },
    ],
  };
}

function sortedTiers(policy: CommitteePolicy): Tier[] {
  return [...policy.tiers].sort((a, b) => a.maxActive - b.maxActive);
}

function tierFor(policy: CommitteePolicy, activeCount: number): Tier {
  const tiers = sortedTiers(policy);
  for (const t of tiers) {
    if (activeCount <= t.maxActive) return t;
  }
  return tiers[tiers.length - 1]!;
}

function min3(a: number, b: number, c: number): number {
  return Math.min(a, b, c);
}

function uniqueSorted(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  out.sort();
  return out;
}

function hashKey(walletId: string, nodeId: string, version: string): string {
  return createHash("sha256")
    .update(`${walletId}|${nodeId}|${version}`)
    .digest("hex");
}

function sortByHash(ids: string[], walletId: string, version: string): void {
  ids.sort((a, b) => {
    const ha = hashKey(walletId, a, version);
    const hb = hashKey(walletId, b, version);
    if (ha === hb) return a.localeCompare(b);
    return ha.localeCompare(hb);
  });
}

/**
 * Deterministic committee selection — same algorithm as aicw_node/pkg/committee.
 */
export function selectCommittee(
  walletId: string,
  activePool: string[],
  oldCommittee: string[] | null = null,
  policy: CommitteePolicy = defaultCommitteePolicy(),
): CommitteePlan {
  if (!walletId.trim()) {
    throw new Error("walletId is required");
  }

  const pool = uniqueSorted(activePool);
  const activeCount = pool.length;
  if (activeCount === 0) {
    throw new Error("empty active pool");
  }

  const tier = tierFor(policy, activeCount);
  const size = min3(activeCount, policy.cap, tier.committeeSize);

  if (size < policy.mpcThreshold + 1) {
    throw new Error(
      `cannot form quorum — size ${size} < threshold+1 ${policy.mpcThreshold + 1}`,
    );
  }

  const poolSet = new Set(pool);
  const retained: string[] = [];
  const retainedSet = new Set<string>();

  for (const id of oldCommittee ?? []) {
    if (!poolSet.has(id) || retainedSet.has(id)) continue;
    retained.push(id);
    retainedSet.add(id);
  }

  let trimmedRetained = retained;
  if (trimmedRetained.length > size) {
    trimmedRetained = [...trimmedRetained];
    sortByHash(trimmedRetained, walletId, policy.version);
    trimmedRetained = trimmedRetained.slice(0, size);
  }

  const retainedSet2 = new Set(trimmedRetained);
  const fillCandidates = pool.filter((id) => !retainedSet2.has(id));
  sortByHash(fillCandidates, walletId, policy.version);

  const committee = [...trimmedRetained];
  for (const id of fillCandidates) {
    if (committee.length >= size) break;
    committee.push(id);
  }

  if (committee.length !== size) {
    throw new Error(
      `insufficient candidates — got ${committee.length}, want ${size}`,
    );
  }

  committee.sort();

  return {
    nodeIds: committee,
    threshold: policy.mpcThreshold,
    spare: tier.spare,
    committeeSize: size,
  };
}
