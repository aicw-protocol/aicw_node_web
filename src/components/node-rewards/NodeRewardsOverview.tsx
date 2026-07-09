"use client";

import { useCallback, useEffect, useState } from "react";
import { truncateAddress } from "@/lib/formatWallet";
import { formatStakeSol } from "@/lib/stakingCurve";

interface NodeRewardEntry {
  id: number;
  ownerWallet: string;
  nodeId: string;
  createdAt: string;
  status: "registered" | "inactive";
  referralWalletOpens: number;
  rewardSol: number;
}

interface NodeRewardsSummary {
  registeredNodes: number;
  nodesWithActivity: number;
  totalWalletOpens: number;
  totalRewardSol: number;
}

interface NodeRewardsResponse {
  summary: NodeRewardsSummary;
  nodes: NodeRewardEntry[];
}

type LoadState = "loading" | "ready" | "error" | "unconfigured";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function NodeRewardsOverview() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<NodeRewardsResponse | null>(null);

  const loadRewards = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/node-rewards", { cache: "no-store" });
      if (res.status === 503) {
        setLoadState("unconfigured");
        return;
      }
      if (!res.ok) throw new Error("load failed");
      setData((await res.json()) as NodeRewardsResponse);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  if (loadState === "loading") {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
        Loading node rewards…
      </div>
    );
  }

  if (loadState === "unconfigured") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
        Database is not configured. Set <code className="text-amber-50">DATABASE_*</code> in{" "}
        <code className="text-amber-50">.env.local</code>.
      </div>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
        Failed to load node rewards.
        <button
          type="button"
          onClick={() => loadRewards()}
          className="ml-3 rounded border border-red-400/40 px-2 py-1"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, nodes } = data;
  const earningNodes = nodes.filter(
    (node) => node.referralWalletOpens > 0 || node.rewardSol > 0,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">Registered nodes</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.registeredNodes}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">Nodes earning rewards</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.nodesWithActivity}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">Wallet opens (network)</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.totalWalletOpens}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">SOL paid out (network)</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">
            {formatStakeSol(summary.totalRewardSol)} SOL
          </p>
        </div>
      </section>

      {earningNodes.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
          <i className="fa-solid fa-sack-dollar mr-2 text-accent" aria-hidden />
          No node rewards recorded yet. When wallets are issued through active nodes, SOL
          rewards will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-panel">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-content-muted">
                <th className="px-4 py-3 font-medium">Node</th>
                <th className="px-4 py-3 font-medium">Operator</th>
                <th className="px-4 py-3 font-medium text-right">Wallet opens</th>
                <th className="px-4 py-3 font-medium text-right">SOL earned</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody>
              {earningNodes.map((node) => (
                <tr
                  key={node.id}
                  className="border-b border-surface-border/60 last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-content-primary">{node.nodeId}</td>
                  <td className="px-4 py-3 font-mono text-content-secondary">
                    {truncateAddress(node.ownerWallet, 6)}
                  </td>
                  <td className="px-4 py-3 text-right text-content-secondary">
                    {node.referralWalletOpens}
                  </td>
                  <td className="px-4 py-3 text-right text-content-primary">
                    {formatStakeSol(node.rewardSol)} SOL
                  </td>
                  <td className="px-4 py-3 text-content-muted hidden sm:table-cell">
                    {formatDate(node.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nodes.length > earningNodes.length && (
        <p className="text-xs text-content-muted">
          {nodes.length - earningNodes.length} registered node
          {nodes.length - earningNodes.length === 1 ? "" : "s"} with no rewards yet.
        </p>
      )}
    </div>
  );
}
