"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { truncateAddress } from "@/lib/formatWallet";
import type { NodeListResponse, NodeRecord } from "@/lib/db/types";
import {
  getNodeConnectivityStatus,
  type NodeConnectivityStatus,
} from "@/lib/nodePing";
import { CopyIconButton } from "@/components/CopyIconButton";

type LoadState = "loading" | "ready" | "error" | "unconfigured";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const STATUS_DOT_CLASS: Record<NodeConnectivityStatus, string> = {
  registered: "bg-content-muted",
  connecting: "bg-amber-400",
  active: "bg-emerald-500",
};

const STATUS_ARIA_LABEL: Record<NodeConnectivityStatus, string> = {
  registered: "Registered",
  connecting: "Connecting",
  active: "Active",
};

function StatusDot({
  status,
  lastPingAt,
}: {
  status: NodeRecord["status"];
  lastPingAt: string | null;
}) {
  const connectivity = getNodeConnectivityStatus(status, lastPingAt);

  return (
    <span
      className={`inline-block h-[6px] w-[6px] rounded-full ${STATUS_DOT_CLASS[connectivity]}`}
      aria-label={STATUS_ARIA_LABEL[connectivity]}
      title={STATUS_ARIA_LABEL[connectivity]}
    />
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border text-content-muted">
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
                  Node name
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
                  Node ID
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">Owner</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr
                  key={node.id}
                  className="border-b border-surface-border last:border-0"
                >
                  <td className="max-w-[8rem] px-4 py-3 sm:max-w-[10rem] lg:max-w-[12rem]">
                    {node.nodeName ? (
                      <span
                        className="block truncate text-sm text-content-primary"
                        title={node.nodeName}
                      >
                        {node.nodeName}
                      </span>
                    ) : (
                      <span className="text-sm text-content-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <span
                        className="min-w-0 truncate font-mono text-xs text-content-secondary sm:max-w-[14rem] sm:text-sm lg:max-w-none"
                        title={node.nodeId}
                      >
                        {node.nodeId}
                      </span>
                      <CopyIconButton value={node.nodeId} label="Node ID" />
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-content-secondary"
                    title={node.ownerWallet}
                  >
                    {truncateAddress(node.ownerWallet)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusDot status={node.status} lastPingAt={node.lastPingAt} />
                  </td>
                  <td className="px-4 py-3 text-content-muted">
                    {formatDate(node.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
