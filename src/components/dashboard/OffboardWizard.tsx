"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { NodeRecord } from "@/lib/db/types";
import { UNSTAKE_COOLDOWN_HOURS } from "@/lib/unstakeConstants";

interface OffboardStatusResponse {
  registeredNodeCount: number;
  pendingUnstake: {
    amountSol: number;
    returnAvailableAt: string | null;
    status: string;
  } | null;
  returnAvailableAt: string | null;
  hoursUntilReturn: number | null;
  isReturnDue: boolean;
  events: {
    eventType: string;
    detail: string | null;
    createdAt: string;
    nodeName: string | null;
  }[];
}

interface OffboardWizardProps {
  wallet: string;
  nodes: NodeRecord[];
  onUpdated: () => void;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function OffboardWizard({ wallet, nodes, onUpdated }: OffboardWizardProps) {
  const [status, setStatus] = useState<OffboardStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/offboard/status?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("status");
      setStatus((await res.json()) as OffboardStatusResponse);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const offboardNode = async (node: NodeRecord) => {
    const label = node.nodeName ?? node.nodeId;
    if (
      !window.confirm(
        `Remove ${label} and begin unstaking?\n\nIf this is your last node, staked SOL returns after ${UNSTAKE_COOLDOWN_HOURS} hours.`,
      )
    ) {
      return;
    }

    setBusyNodeId(node.nodeId);
    try {
      const res = await fetch("/api/offboard/node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          processStopped: true,
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? "Offboard failed");
      toast.success(json.message ?? "Node offboarded");
      await loadStatus();
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offboard failed");
    } finally {
      setBusyNodeId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-panel p-6 text-sm text-content-secondary">
        Loading offboard status…
      </div>
    );
  }

  const pending = status?.pendingUnstake;

  return (
    <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
      <h2 className="text-lg font-medium text-content-primary">Offboard &amp; Unstake</h2>
      <p className="mt-2 text-sm text-content-secondary">
        Remove nodes one at a time. When your last node is removed, staked SOL is
        scheduled for return to your wallet after a {UNSTAKE_COOLDOWN_HOURS}-hour
        waiting period.
      </p>

      {pending ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Unstake in progress</p>
          <p className="mt-1">
            {formatStakePending(pending.amountSol)} SOL returns around{" "}
            <span className="text-amber-50">{formatWhen(pending.returnAvailableAt)}</span>
            {status?.isReturnDue ? " (due — processing on next cron run)" : ""}
          </p>
        </div>
      ) : null}

      {nodes.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {nodes.map((node) => (
            <li
              key={node.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface/60 p-4"
            >
              <div>
                <p className="font-medium text-content-primary">
                  {node.nodeName ?? node.nodeId}
                </p>
                <p className="font-mono text-xs text-content-muted">{node.nodeId}</p>
              </div>
              <button
                type="button"
                disabled={Boolean(pending) || busyNodeId === node.nodeId}
                onClick={() => offboardNode(node)}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {busyNodeId === node.nodeId ? "Processing…" : "Unstake node"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-content-secondary">
          No registered nodes. Use the desktop app to remove local files if needed.
        </p>
      )}

      {status?.events?.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-content-primary">Recent activity</h3>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs text-content-muted">
            {status.events.slice(0, 8).map((event) => (
              <li key={`${event.createdAt}-${event.eventType}`}>
                <span className="text-content-secondary">{formatWhen(event.createdAt)}</span>
                {" — "}
                {event.eventType.replaceAll("_", " ")}
                {event.detail ? `: ${event.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function formatStakePending(amountSol: number): string {
  return Number(amountSol).toLocaleString(undefined, {
    maximumFractionDigits: 9,
  });
}
