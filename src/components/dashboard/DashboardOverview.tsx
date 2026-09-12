"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { truncateAddress } from "@/lib/formatWallet";
import { formatStakeSol } from "@/lib/stakingCurve";
import type { NodeRecord, StakingRecord } from "@/lib/db/types";
import { isNodePingActive } from "@/lib/nodePing";
import { WalletButton } from "@/components/WalletButton";
import { DesktopAppPanel } from "@/components/dashboard/DesktopAppPanel";
import { DeleteNodeConfirmModal } from "@/components/dashboard/DeleteNodeConfirmModal";
import { RemoveNodeStatusPanel } from "@/components/dashboard/RemoveNodeStatusPanel";
import {
  signGuiWalletAction,
  walletCanSignMessages,
} from "@/lib/walletSignChallenge";

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
    committeeWalletOpens: number;
    referralWalletOpens: number;
    rewardSol: number;
    rewardToken: number;
    availableSol: number;
    availableToken: number;
  };
  rewardConfig?: {
    solWithdrawMin: number;
    tokenSymbol: string;
    tokenMint: string | null;
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
  const { publicKey, connected, signMessage, wallet: activeWallet } = useWallet();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<NodeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [withdrawing, setWithdrawing] = useState<"sol" | "token" | null>(null);

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

  const handleWithdraw = async (asset: "sol" | "token") => {
    if (!publicKey) return;
    if (!walletCanSignMessages(activeWallet?.adapter, signMessage)) {
      toast.error("This wallet does not support message signing.");
      return;
    }

    setWithdrawing(asset);
    try {
      const signed = await signGuiWalletAction({
        adapter: activeWallet?.adapter,
        publicKey,
        signMessage,
        wallet: publicKey.toBase58(),
        purpose: asset === "sol" ? "withdraw_sol" : "withdraw_token",
      });

      const endpoint =
        asset === "sol" ? "/api/rewards/withdraw/sol" : "/api/rewards/withdraw/token";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerWallet: signed.wallet,
          challengeToken: signed.challengeToken,
          signatureBase64: signed.signatureBase64,
          signedMessageBase64: signed.signedMessageBase64,
          message: signed.message,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        amountSol?: number;
        amountToken?: number;
        txSignature?: string;
      };

      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Withdraw failed");
        return;
      }

      const tokenLabel = data?.rewardConfig?.tokenSymbol ?? "TAICW";
      toast.success(
        asset === "sol"
          ? `Sent ${formatStakeSol(json.amountSol ?? 0)} SOL`
          : `Sent ${formatStakeSol(json.amountToken ?? 0)} ${tokenLabel}`,
      );
      await loadDashboard();
    } catch {
      toast.error("Withdraw request failed");
    } finally {
      setWithdrawing(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!nodeToDelete || !publicKey) return;

    if (!walletCanSignMessages(activeWallet?.adapter, signMessage)) {
      toast.error("This wallet does not support message signing.");
      return;
    }

    setDeleting(true);
    try {
      const signed = await signGuiWalletAction({
        adapter: activeWallet?.adapter,
        publicKey,
        signMessage,
        wallet: publicKey.toBase58(),
        purpose: "offboard",
        nodeId: nodeToDelete.nodeId,
        nodeName: nodeToDelete.nodeName ?? undefined,
      });

      const res = await fetch("/api/offboard/node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: signed.wallet,
          nodeId: nodeToDelete.nodeId,
          nodeName: nodeToDelete.nodeName,
          challengeToken: signed.challengeToken,
          signatureBase64: signed.signatureBase64,
          signedMessageBase64: signed.signedMessageBase64,
          message: signed.message,
        }),
      });

      const json = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        toast.error(json.error ?? "Failed to remove node");
        return;
      }

      setNodeToDelete(null);
      toast.success(
        json.message ??
          "Node removed from the network. Use Remove node in the desktop app to delete local files.",
      );
      await loadDashboard();
      window.dispatchEvent(new Event("aicw-node-registered"));
      window.dispatchEvent(new Event("aicw-staking-updated"));
    } catch {
      toast.error("Remove node request failed");
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
            Connect your wallet to view your dashboard and node status.
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

  if (!publicKey) {
    return null;
  }

  const walletLabel = truncateAddress(publicKey.toBase58());
  const tokenLabel = data.rewardConfig?.tokenSymbol ?? "TAICW";
  const solWithdrawMin = data.rewardConfig?.solWithdrawMin ?? 0.01;
  const canWithdrawSol =
    withdrawing === null && data.totals.availableSol >= solWithdrawMin;
  const canWithdrawToken =
    withdrawing === null && data.totals.availableToken > 0;

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

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <p className="text-xs text-content-muted">SOL accrued</p>
            <p className="mt-1 text-xl font-semibold text-content-primary">
              {formatStakeSol(data.totals.rewardSol)} SOL
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Available: {formatStakeSol(data.totals.availableSol)} SOL
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <p className="text-xs text-content-muted">{tokenLabel} accrued</p>
            <p className="mt-1 text-xl font-semibold text-content-primary">
              {formatStakeSol(data.totals.rewardToken)}
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Available: {formatStakeSol(data.totals.availableToken)}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <p className="text-xs text-content-muted">Committee wallet issuances</p>
            <p className="mt-1 text-xl font-semibold text-content-primary">
              {data.totals.committeeWalletOpens ?? data.totals.referralWalletOpens}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4 flex flex-col justify-center gap-2">
            <button
              type="button"
              disabled={!canWithdrawSol}
              onClick={() => void handleWithdraw("sol")}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {withdrawing === "sol" ? "Withdrawing SOL…" : "Withdraw SOL"}
            </button>
            <button
              type="button"
              disabled={!canWithdrawToken}
              onClick={() => void handleWithdraw("token")}
              className="rounded-lg border border-surface-border px-3 py-2 text-sm text-content-primary disabled:opacity-40"
            >
              {withdrawing === "token" ? `Withdrawing ${tokenLabel}…` : `Withdraw ${tokenLabel}`}
            </button>
            {!canWithdrawSol && data.totals.availableSol > 0 ? (
              <p className="text-xs text-content-muted">SOL min: {formatStakeSol(solWithdrawMin)}</p>
            ) : null}
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
                      className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
                      aria-label={`Remove node ${node.nodeName ?? node.nodeId}`}
                    >
                      Remove node
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-content-muted">Ping status</p>
                    <p className="mt-1 text-sm text-content-secondary">
                      {isNodePingActive(node.lastPingAt)
                        ? "Receiving pings — eligible for MPC committee"
                        : "Waiting for node to start and ping"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-muted">Committee issuances</p>
                    <p className="mt-1 text-sm text-content-primary">
                      {node.committeeWalletOpens ?? node.referralWalletOpens}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-content-muted">SOL / {tokenLabel}</p>
                    <p className="mt-1 text-sm text-content-primary">
                      {formatStakeSol(node.availableSol ?? node.rewardSol)} /{" "}
                      {formatStakeSol(node.availableToken ?? node.rewardToken)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <DesktopAppPanel
        eligibility={data.eligibility}
        activeStake={data.activeStake}
      />

      <RemoveNodeStatusPanel wallet={publicKey.toBase58()} />

      {nodeToDelete ? (
        <DeleteNodeConfirmModal
          node={nodeToDelete}
          open
          deleting={deleting}
          isLastNode={data.nodes.length === 1}
          onCancel={() => {
            if (!deleting) setNodeToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
