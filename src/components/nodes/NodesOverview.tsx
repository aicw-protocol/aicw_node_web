"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { truncateAddress } from "@/lib/formatWallet";
import type { NodeListResponse, NodeRecord } from "@/lib/db/types";

type LoadState = "loading" | "ready" | "error" | "unconfigured";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: NodeRecord["status"] }) {
  const label = status === "registered" ? "Registered" : "Inactive";
  const className =
    status === "registered"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-gray-500/40 bg-gray-500/10 text-content-secondary";

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${className}`}>
      {label}
    </span>
  );
}

export function NodesOverview({ hideStats = false }: { hideStats?: boolean }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<NodeListResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNodes = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/nodes", { cache: "no-store" });
      if (res.status === 503) {
        setLoadState("unconfigured");
        setData(null);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load nodes");
      }
      const json = (await res.json()) as NodeListResponse;
      setData(json);
      setLoadState("ready");
    } catch {
      setLoadState("error");
      setErrorMessage("Could not load nodes from the database.");
    }
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    const onRegistered = () => {
      loadNodes();
    };
    window.addEventListener("aicw-node-registered", onRegistered);
    return () => window.removeEventListener("aicw-node-registered", onRegistered);
  }, [loadNodes]);

  if (loadState === "loading") {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
        Loading registered nodes…
      </div>
    );
  }

  if (loadState === "unconfigured") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
        <p className="font-medium">
          <i className="fa-solid fa-database mr-2" aria-hidden />
          Database not configured
        </p>
        <p className="mt-2 text-amber-100/80">
          Set <code className="text-amber-50">DATABASE_*</code> or{" "}
          <code className="text-amber-50">DATABASE_URL</code> in{" "}
          <code className="text-amber-50">.env.local</code>, then run{" "}
          <code className="text-amber-50">npm run db:init</code>.
        </p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
        <p>{errorMessage}</p>
        <button
          type="button"
          onClick={() => {
            loadNodes().catch(() => toast.error("Retry failed"));
          }}
          className="mt-4 rounded-lg border border-red-400/40 px-3 py-2 text-red-100 hover:bg-red-500/10"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats ?? { total: 0, activeRegistered: 0 };
  const nodes = data?.nodes ?? [];

  return (
    <div className="space-y-6">
      {!hideStats ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-surface-border bg-surface-panel p-5">
            <p className="text-sm text-content-secondary">Total registered nodes</p>
            <p className="mt-2 text-3xl font-semibold text-content-primary">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-panel p-5">
            <p className="text-sm text-content-secondary">Active (DB registration)</p>
            <p className="mt-2 text-3xl font-semibold text-content-primary">
              {stats.activeRegistered}
            </p>
            <p className="mt-2 text-xs text-content-muted">
              Live ping not connected yet — counts reflect DB registration only.
            </p>
          </div>
        </div>
      ) : null}

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
          No nodes registered yet. Register your first node below.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-surface-border bg-surface/60 text-content-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Node ID</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr
                    key={node.id}
                    className="border-b border-surface-border/70 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-content-secondary sm:text-sm">
                      {node.nodeId}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-content-secondary"
                      title={node.ownerWallet}
                    >
                      {truncateAddress(node.ownerWallet)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={node.status} />
                    </td>
                    <td className="px-4 py-3 text-content-secondary">
                      {formatDate(node.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
