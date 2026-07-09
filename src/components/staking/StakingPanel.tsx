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
import {
  formatStakeSol,
  lamportsFromSol,
  meetsMinimumStake,
} from "@/lib/stakingCurve";
import type { StakingRecord } from "@/lib/db/types";

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
  stakes: StakingRecord[];
  requiredStakeSol: number;
}

type PanelState = "loading" | "ready" | "error" | "unconfigured";

export function StakingPanel() {
  const { publicKey, connected, sendTransaction } = useWallet();
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

    if (walletStaking?.activeStake) {
      toast.error("You already have an active stake");
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

  const handleUnstakeRequest = async () => {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/staking/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Unstake request failed");
      }
      toast.success("Unstake requested — manual return by admin");
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

  const activeStake = walletStaking?.activeStake;
  const required = curve.requiredStakeSol;
  const hasSufficientStake =
    activeStake &&
    activeStake.status === "active" &&
    meetsMinimumStake(activeStake.amountSol, required);

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-surface-border bg-surface-panel p-6">
        <h2 className="text-lg font-medium text-content-primary">Stake SOL</h2>
        <p className="mt-2 text-sm text-content-secondary">
          Send SOL to the treasury wallet when the fee curve requires it. Returns
          are processed manually on unstake requests (no slashing).
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
                <p className="text-xs text-content-muted">Your active stake</p>
                <p className="mt-1 text-xl font-semibold text-content-primary">
                  {activeStake
                    ? `${formatStakeSol(activeStake.amountSol)} SOL`
                    : "None"}
                </p>
                {activeStake?.status === "unstake_requested" && (
                  <p className="mt-1 text-xs text-amber-300">Unstake pending</p>
                )}
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
                  disabled={
                    submitting ||
                    Boolean(activeStake) ||
                    !curve.treasuryWallet
                  }
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-muted disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
                      Processing…
                    </>
                  ) : (
                    <>Stake {formatStakeSol(required)} SOL</>
                  )}
                </button>

                {activeStake?.status === "active" && (
                  <button
                    type="button"
                    onClick={handleUnstakeRequest}
                    disabled={submitting}
                    className="rounded-lg border border-surface-border px-4 py-2.5 text-sm text-content-secondary hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                  >
                    Request unstake
                  </button>
                )}
              </div>
            )}

            {hasSufficientStake && (
              <p className="text-sm text-emerald-300">
                Your stake meets the current curve requirement.
              </p>
            )}

            {activeStake?.txSignature && (
              <p className="font-mono text-xs text-content-muted">
                Tx: {activeStake.txSignature.slice(0, 20)}…
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export type { CurveResponse };
