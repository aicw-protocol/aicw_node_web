"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { formatStakeSol, lamportsFromSol } from "@/lib/stakingCurve";
import type { StakingRecord } from "@/lib/db/types";
import {
  formatUnstakeReturnWait,
  formatUnstakeReturnWaitShort,
} from "@/lib/unstakeConstants";
import {
  signGuiWalletAction,
  walletCanSignMessages,
} from "@/lib/walletSignChallenge";

interface CurveResponse {
  registeredNodeCount: number;
  requiredStakeSol: number;
  requiredStakeSolFormatted: string;
  freeNodeThreshold: number;
  treasuryWallet: string | null;
  points: { nodeCount: number; requiredStakeSol: number }[];
}

interface WalletStakingResponse {
  activeStake: StakingRecord | null;
  activeStakes: StakingRecord[];
  unboundActiveStakes: StakingRecord[];
  stakes: StakingRecord[];
  requiredStakeSol: number;
}

type PanelState = "loading" | "ready" | "error" | "unconfigured";

export function StakingPanel() {
  const { publicKey, connected, sendTransaction, signMessage, wallet: activeWallet } =
    useWallet();
  const { connection } = useConnection();
  const [panelState, setPanelState] = useState<PanelState>("loading");
  const [curve, setCurve] = useState<CurveResponse | null>(null);
  const [walletStaking, setWalletStaking] = useState<WalletStakingResponse | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setPanelState("loading");
    try {
      const curveRes = await fetch("/api/staking/curve", { cache: "no-store" });
      if (curveRes.status === 503) {
        setPanelState("unconfigured");
        return;
      }
      if (!curveRes.ok) throw new Error("curve");
      const curveJson = (await curveRes.json()) as CurveResponse;
      setCurve(curveJson);

      if (connected && publicKey) {
        const stakeRes = await fetch(
          `/api/staking?wallet=${encodeURIComponent(publicKey.toBase58())}`,
          { cache: "no-store" },
        );
        if (stakeRes.ok) {
          setWalletStaking((await stakeRes.json()) as WalletStakingResponse);
        } else {
          setWalletStaking(null);
        }
      } else {
        setWalletStaking(null);
      }

      setPanelState("ready");
    } catch {
      setPanelState("error");
    }
  }, [connected, publicKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStake = async () => {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet to stake");
      return;
    }

    if (!curve?.treasuryWallet) {
      toast.error("Staking treasury wallet is not configured");
      return;
    }

    const required = curve.requiredStakeSol;
    if (required <= 0) {
      toast.error("Staking is not required yet (fewer than 30 nodes registered)");
      return;
    }

    setSubmitting(true);
    try {
      const lamports = lamportsFromSol(required);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(curve.treasuryWallet),
          lamports,
        }),
      );

      const signature = await sendTransaction(transaction, connection as Connection);
      toast.loading("Confirming transaction…", { id: "stake-tx" });

      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed",
      );

      const recordRes = await fetch("/api/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          txSignature: signature,
        }),
      });

      const recordJson = (await recordRes.json()) as { error?: string };
      if (!recordRes.ok) {
        throw new Error(recordJson.error ?? "Failed to record stake");
      }

      toast.success(`Staked ${formatStakeSol(required)} SOL`, { id: "stake-tx" });
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Staking transaction failed";
      toast.error(message, { id: "stake-tx" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnstakeRequest = async (stakeId?: number) => {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet");
      return;
    }

    if (!walletCanSignMessages(activeWallet?.adapter, signMessage)) {
      toast.error("This wallet does not support message signing.");
      return;
    }

    setSubmitting(true);
    try {
      const signed = await signGuiWalletAction({
        adapter: activeWallet?.adapter,
        publicKey,
        signMessage,
        wallet: publicKey.toBase58(),
        purpose: "unstake",
      });

      const res = await fetch("/api/staking/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: signed.wallet,
          stakeId,
          challengeToken: signed.challengeToken,
          signatureBase64: signed.signatureBase64,
          signedMessageBase64: signed.signedMessageBase64,
          message: signed.message,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Unstake request failed");
      }
      toast.success(
        `Unstake approved — SOL returns ${formatUnstakeReturnWaitShort()}`,
      );
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unstake request failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (panelState === "loading") {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
        Loading staking info…
      </div>
    );
  }

  if (panelState === "unconfigured") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
        Database or treasury wallet is not configured. Set{" "}
        <code className="text-amber-50">DATABASE_*</code> and{" "}
        <code className="text-amber-50">STAKING_TREASURY_WALLET</code> in{" "}
        <code className="text-amber-50">.env.local</code>.
      </div>
    );
  }

  if (panelState === "error" || !curve) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
        Failed to load staking data.
        <button
          type="button"
          onClick={() => loadData()}
          className="ml-3 rounded border border-red-400/40 px-2 py-1"
        >
          Retry
        </button>
      </div>
    );
  }

  const activeStakes = walletStaking?.activeStakes ?? [];
  const unboundStakes = walletStaking?.unboundActiveStakes ?? [];
  const pendingUnstakes =
    walletStaking?.stakes.filter((stake) => stake.status === "unstake_requested") ??
    [];
  const required = curve.requiredStakeSol;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-surface-border bg-surface-panel p-6">
        <h2 className="text-lg font-medium text-content-primary">Stake SOL</h2>
        <p className="mt-2 text-sm text-content-secondary">
          Stake once per node at the current fee curve. Each stake is consumed
          when you register a node in the desktop app. Removing a node returns
          its stake after {formatUnstakeReturnWait()}.
        </p>

        {!connected ? (
          <p className="mt-4 rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm text-content-secondary">
            <i className="fa-solid fa-wallet mr-2 text-accent" aria-hidden />
            Connect your wallet to stake or request unstake.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
                <p className="text-xs text-content-muted">Required for next node</p>
                <p className="mt-1 text-xl font-semibold text-content-primary">
                  {formatStakeSol(required)} SOL
                </p>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
                <p className="text-xs text-content-muted">Unbound stakes</p>
                <p className="mt-1 text-xl font-semibold text-content-primary">
                  {unboundStakes.length}
                </p>
                <p className="mt-1 text-xs text-content-muted">
                  {activeStakes.length} active total
                </p>
              </div>
            </div>

            {required <= 0 ? (
              <p className="text-sm text-emerald-300">
                Staking not required while fewer than {curve.freeNodeThreshold}{" "}
                nodes are registered.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleStake}
                  disabled={submitting || !curve.treasuryWallet}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-muted disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
                      Processing…
                    </>
                  ) : (
                    <>Stake {formatStakeSol(required)} SOL for next node</>
                  )}
                </button>
              </div>
            )}

            {unboundStakes.length > 0 && required > 0 ? (
              <p className="text-sm text-emerald-300">
                You have {unboundStakes.length} stake(s) ready — register a node
                in the desktop app to use one.
              </p>
            ) : null}

            {unboundStakes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-content-muted">
                  Unbound stakes
                </p>
                {unboundStakes.map((stake) => (
                  <div
                    key={stake.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-content-primary">
                        {formatStakeSol(stake.amountSol)} SOL
                      </p>
                      <p className="text-xs text-content-muted">
                        Staked{" "}
                        {new Date(stake.stakedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {stake.curveRegisteredCountAtStake != null
                          ? ` · curve at ${stake.curveRegisteredCountAtStake} nodes`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleUnstakeRequest(stake.id)}
                      disabled={submitting}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-content-secondary hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                    >
                      Request unstake
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {activeStakes.some((stake) => stake.boundNodeId) ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-content-muted">
                  Bound to nodes
                </p>
                {activeStakes
                  .filter((stake) => stake.boundNodeId)
                  .map((stake) => (
                    <div
                      key={stake.id}
                      className="rounded-lg border border-surface-border bg-surface/40 px-4 py-3 text-sm text-content-secondary"
                    >
                      {formatStakeSol(stake.amountSol)} SOL →{" "}
                      <code className="text-content-primary">{stake.boundNodeId}</code>
                      <span className="ml-2 text-xs text-content-muted">
                        (returned when node is removed)
                      </span>
                    </div>
                  ))}
              </div>
            ) : null}

            {pendingUnstakes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                  Pending returns
                </p>
                {pendingUnstakes.map((stake) => (
                  <p key={stake.id} className="text-sm text-amber-200">
                    {formatStakeSol(stake.amountSol)} SOL — returns{" "}
                    {stake.returnAvailableAt
                      ? new Date(stake.returnAvailableAt).toLocaleString()
                      : formatUnstakeReturnWaitShort()}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export type { CurveResponse };
