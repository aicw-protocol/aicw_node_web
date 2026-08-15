"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnstakeReturnWaitShort } from "@/lib/unstakeConstants";

interface RemoveNodeStatusResponse {
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

interface RemoveNodeStatusPanelProps {
  wallet: string;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatStakePending(amountSol: number): string {
  return Number(amountSol).toLocaleString(undefined, {
    maximumFractionDigits: 9,
  });
}

export function RemoveNodeStatusPanel({ wallet }: RemoveNodeStatusPanelProps) {
  const [status, setStatus] = useState<RemoveNodeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/offboard/status?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("status");
      setStatus((await res.json()) as RemoveNodeStatusResponse);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const onUpdate = () => {
      loadStatus();
    };
    window.addEventListener("aicw-node-registered", onUpdate);
    window.addEventListener("aicw-staking-updated", onUpdate);
    return () => {
      window.removeEventListener("aicw-node-registered", onUpdate);
      window.removeEventListener("aicw-staking-updated", onUpdate);
    };
  }, [loadStatus]);

  if (loading) {
    return null;
  }

  const pending = status?.pendingUnstake;
  const hasEvents = (status?.events?.length ?? 0) > 0;

  if (!pending && !hasEvents) {
    return null;
  }

  return (
    <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
      <h2 className="text-lg font-medium text-content-primary">Node removal status</h2>
      <p className="mt-2 text-sm text-content-secondary">
        When you remove your last node, staked SOL returns to your wallet{" "}
        {formatUnstakeReturnWaitShort()}.
      </p>

      {pending ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium text-amber-50">Stake return in progress</p>
          <p className="mt-1">
            {formatStakePending(pending.amountSol)} SOL returns around{" "}
            <span className="text-amber-50">{formatWhen(pending.returnAvailableAt)}</span>
            {status?.isReturnDue ? " (due — processing on next cron run)" : ""}
          </p>
        </div>
      ) : null}

      {hasEvents ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-content-primary">Recent activity</h3>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-xs text-content-muted">
            {status!.events.slice(0, 8).map((event) => (
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
