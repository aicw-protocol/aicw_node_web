"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { truncateAddress } from "@/lib/formatWallet";
import { formatStakeSol } from "@/lib/stakingCurve";
import type { NodeRecord, StakingRecord } from "@/lib/db/types";
import { isNodePingActive } from "@/lib/nodePing";
import { WalletButton } from "@/components/WalletButton";
import { CreateNodeFlow } from "@/components/nodes/CreateNodeFlow";
import { DeleteNodeConfirmModal } from "@/components/dashboard/DeleteNodeConfirmModal";

interface RegistrationEligibility {
  registeredNodeCount: number;
  requiredStakeSol: number;
  canRegister: boolean;
  blockReason: string | null;
}

interface DashboardResponse {
  nodes: NodeRecord[];
  eligibility: RegistrationEligibility;
  activeStake: StakingRecord | null;
  totals: {
    referralWalletOpens: number;
    rewardSol: number;
    rewardToken: number;
  };
}

type LoadState = "loading" | "ready" | "error" | "disconnected" | "unconfigured";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function NodeStatus({
  status,
  lastPingAt,
}: {
  status: NodeRecord["status"];
  lastPingAt: string | null;
}) {
  const pingActive = isNodePingActive(lastPingAt);
  const label = pingActive
    ? "Active"
    : status === "registered"
      ? "Registered"
      : "Inactive";

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-content-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          pingActive
            ? "bg-emerald-500"
            : status === "registered"
              ? "bg-amber-400/80"
              : "bg-content-muted/60"
        }`}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function DashboardOverview() {
  const { publicKey, connected } = useWallet();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<NodeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!connected || !publicKey) {
      setLoadState("disconnected");
      setData(null);
      return;
    }

    setLoadState("loading");
    try {
      const res = await fetch(
        `/api/dashboard?wallet=${encodeURIComponent(publicKey.toBase58())}`,
        { cache: "no-store" },
      );

      if (res.status === 503) {
        setLoadState("unconfigured");
        return;
      }

      if (!res.ok) throw new Error("dashboard load failed");

      setData((await res.json()) as DashboardResponse);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [connected, publicKey]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onUpdate = () => {
      loadDashboard();
    };
    window.addEventListener("aicw-node-registered", onUpdate);
    window.addEventListener("aicw-staking-updated", onUpdate);
    return () => {
      window.removeEventListener("aicw-node-registered", onUpdate);
      window.removeEventListener("aicw-staking-updated", onUpdate);
    };
  }, [loadDashboard]);

  const handleDeleteConfirm = async () => {
    if (!nodeToDelete || !publicKey) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/nodes/${encodeURIComponent(nodeToDelete.nodeId)}?wallet=${encodeURIComponent(publicKey.toBase58())}`,
        { method: "DELETE" },
      );

      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(json.error ?? "Failed to delete node");
        return;
      }

      setData((prev) => {
        if (!prev) return prev;
        const nodes = prev.nodes.filter((node) => node.id !== nodeToDelete.id);
        const totals = nodes.reduce(
          (acc, node) => ({
            referralWalletOpens: acc.referralWalletOpens + node.referralWalletOpens,
            rewardSol: acc.rewardSol + node.rewardSol,
            rewardToken: acc.rewardToken + node.rewardToken,
          }),
          { referralWalletOpens: 0, rewardSol: 0, rewardToken: 0 },
        );

        return {
          ...prev,
          nodes,
          totals,
          eligibility: {
            ...prev.eligibility,
            registeredNodeCount: Math.max(0, prev.eligibility.registeredNodeCount - 1),
          },
        };
      });

      setNodeToDelete(null);
      toast.success("Node removed from your dashboard");
      window.dispatchEvent(new Event("aicw-node-registered"));
    } catch {
      toast.error("Delete request failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loadState === "disconnected") {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-sm text-content-secondary">
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-center">
          <WalletButton layout="default" />
          <p className="text-center text-content-secondary sm:text-left">
            Connect your wallet to view your dashboard and register a node.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
        Loading dashboard…
      </div>
    );
  }

  if (loadState === "unconfigured") {
    return (
      <div className="rounded-xl border border-amber-600/30 bg-amber-500/10 p-6 text-sm text-amber-700 dark:text-amber-200">
        Database is not configured. Set <code className="font-semibold text-amber-800 dark:text-amber-100">DATABASE_*</code>{" "}
        in <code className="font-semibold text-amber-800 dark:text-amber-100">.env.local</code>.
      </div>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <div className="rounded-xl border border-red-600/30 bg-red-500/10 p-6 text-sm text-red-700 dark:text-red-200">
        Failed to load dashboard.
        <button
          type="button"
          onClick={() => loadDashboard()}
          className="ml-3 rounded border border-red-500/40 px-2 py-1 text-red-700 dark:text-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  const walletLabel = publicKey ? truncateAddress(publicKey.toBase58()) : "";

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-content-primary">My wallet</h2>
            <p className="mt-1 font-mono text-sm text-content-secondary">{walletLabel}</p>
          </div>
          <div className="text-sm text-content-secondary">
            Global registered nodes:{" "}
            <span className="text-content-primary">{data.eligibility.registeredNodeCount}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <p className="text-xs text-content-muted">SOL fee rewards</p>
            <p className="mt-1 text-xl font-semibold text-content-primary">
              {formatStakeSol(data.totals.rewardSol)} SOL
            </p>
            <p className="mt-1 text-xs text-content-muted">
              From wallet opens via referral
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <p className="text-xs text-content-muted">Referral wallet opens</p>
            <p className="mt-1 text-xl font-semibold text-content-primary">
              {data.totals.referralWalletOpens}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <p className="text-xs text-content-muted">Token rewards (SPL)</p>
            <p className="mt-1 text-xl font-semibold text-content-secondary">Coming soon</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-content-primary">My nodes</h2>

        {data.nodes.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-panel p-6 text-sm text-content-secondary">
            No nodes registered for this wallet yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {data.nodes.map((node) => (
              <article
                key={node.id}
                className="rounded-xl border border-surface-border bg-surface-panel p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    {node.nodeName ? (
                      <p className="text-sm font-medium text-content-primary">{node.nodeName}</p>
                    ) : null}
                    <p className="font-mono text-sm text-content-primary break-all">{node.nodeId}</p>
                    <p className="mt-2 text-sm text-content-secondary">
                      Registered: {formatDate(node.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <NodeStatus status={node.status} lastPingAt={node.lastPingAt} />
                    <button
                      type="button"
                      onClick={() => setNodeToDelete(node)}
                      className="text-xs text-content-muted transition hover:text-content-primary"
                      aria-label={`Remove node ${node.nodeName ?? node.nodeId}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-content-muted">Ping status</p>
                    <p className="mt-1 text-sm text-content-secondary">
                      {isNodePingActive(node.lastPingAt)
                        ? "Receiving pings — eligible for referrals"
                        : "Waiting for node to start and ping"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-muted">SOL rewards</p>
                    <p className="mt-1 text-sm text-content-primary">
                      {formatStakeSol(node.rewardSol)} SOL
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-muted">Token rewards</p>
                    <p className="mt-1 text-sm text-content-secondary">Coming soon</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <CreateNodeFlow
        eligibility={data.eligibility}
        activeStake={data.activeStake}
        onCreated={loadDashboard}
      />

      {nodeToDelete ? (
        <DeleteNodeConfirmModal
          node={nodeToDelete}
          open
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setNodeToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
