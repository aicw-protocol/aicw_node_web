"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyIconButton } from "@/components/CopyIconButton";
import { truncateAddress, truncateNodeId } from "@/lib/formatWallet";
import { formatStakeSol } from "@/lib/stakingCurve";

interface NodeRewardEntry {
  id: number;
  ownerWallet: string;
  nodeId: string;
  createdAt: string;
  status: "registered" | "inactive";
  committeeWalletOpens: number;
  rewardSol: number;
  rewardToken: number;
  availableSol: number;
  availableToken: number;
}

interface NodeRewardsSummary {
  registeredNodes: number;
  nodesWithActivity: number;
  totalWalletOpens: number;
  totalRewardSol: number;
  totalAvailableSol: number;
  totalRewardToken: number;
  totalAvailableToken: number;
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
    (node) =>
      node.committeeWalletOpens > 0 ||
      node.rewardSol > 0 ||
      node.rewardToken > 0,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">Registered nodes</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.registeredNodes}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">Nodes earning rewards</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.nodesWithActivity}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">Wallet issuances</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.totalWalletOpens}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">SOL accrued (network)</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">
            {formatStakeSol(summary.totalRewardSol)} SOL
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">SOL available</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">
            {formatStakeSol(summary.totalAvailableSol)} SOL
          </p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-panel p-4">
          <p className="text-xs text-content-muted">TAICW accrued</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">
            {formatStakeSol(summary.totalRewardToken)}
          </p>
        </div>
      </section>

      {earningNodes.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
          <i className="fa-solid fa-sack-dollar mr-2 text-accent" aria-hidden />
          No node rewards recorded yet. When wallets are issued through MPC committees, rewards
          will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-panel/60 px-2 pb-2 pt-2 sm:px-4">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-content-muted">
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">Node ID</th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">Owner</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                  Wallets
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                  Claimable SOL
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                  Total SOL
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                  Claimable TAICW
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                  Total TAICW
                </th>
                <th className="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wide sm:table-cell">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {earningNodes.map((node) => (
                <tr key={node.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <span
                        className="font-mono text-xs text-content-secondary whitespace-nowrap sm:text-sm"
                        title={node.nodeId}
                      >
                        {truncateNodeId(node.nodeId)}
                      </span>
                      <CopyIconButton value={node.nodeId} label="Node ID" />
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-content-secondary sm:text-sm"
                    title={node.ownerWallet}
                  >
                    {truncateAddress(node.ownerWallet, 6)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-content-secondary">
                    {node.committeeWalletOpens}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-content-primary">
                    {formatStakeSol(node.availableSol)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-content-primary">
                    {formatStakeSol(node.rewardSol)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-content-primary">
                    {formatStakeSol(node.availableToken)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-content-primary">
                    {formatStakeSol(node.rewardToken)}
                  </td>
                  <td className="hidden px-4 py-3 text-content-muted sm:table-cell">
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
