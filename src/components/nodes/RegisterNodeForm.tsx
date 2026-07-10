"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { formatStakeSol } from "@/lib/stakingCurve";
import type { StakingRecord } from "@/lib/db/types";

interface RegistrationEligibility {
  registeredNodeCount: number;
  requiredStakeSol: number;
  canRegister: boolean;
  blockReason: string | null;
}

interface RegisterNodeFormProps {
  eligibility?: RegistrationEligibility | null;
  activeStake?: StakingRecord | null;
  onRegistered?: () => void;
}

export function RegisterNodeForm({
  eligibility = null,
  activeStake = null,
  onRegistered,
}: RegisterNodeFormProps) {
  const { publicKey, connected } = useWallet();
  const [nodeId, setNodeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canRegister = eligibility?.canRegister ?? true;
  const required = eligibility?.requiredStakeSol ?? 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!connected || !publicKey) {
      toast.error("Connect your wallet to register a node");
      return;
    }

    if (eligibility && !eligibility.canRegister) {
      toast.error(eligibility.blockReason ?? "Not eligible to register a node");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: nodeId.trim(),
          ownerWallet: publicKey.toBase58(),
        }),
      });

      const json = (await res.json()) as { error?: string; node?: { nodeId: string } };

      if (!res.ok) {
        toast.error(json.error ?? "Registration failed");
        return;
      }

      toast.success(`Node registered: ${json.node?.nodeId ?? nodeId}`);
      setNodeId("");
      window.dispatchEvent(new Event("aicw-node-registered"));
      onRegistered?.();
    } catch {
      toast.error("Registration request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
      <h2 className="text-lg font-medium text-content-primary">Register a node</h2>
      <p className="mt-2 text-sm text-content-secondary">
        Register the <code className="text-content-secondary">node_id</code> from your{" "}
        <code className="text-content-secondary">aicw-node init</code> output. Map
        location is set automatically when the node sends its first ping.
      </p>

      {!connected ? (
        <p className="mt-4 rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm text-content-secondary">
          <i className="fa-solid fa-wallet mr-2 text-accent" aria-hidden />
          Connect your wallet to register a node.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {required <= 0 ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              Staking not required yet — fewer than 30 nodes are registered globally.
            </p>
          ) : (
            <div className="rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm text-content-secondary">
              <p>
                Required stake for next node:{" "}
                <span className="font-medium text-content-primary">
                  {formatStakeSol(required)} SOL
                </span>
              </p>
              <p className="mt-1 text-content-secondary">
                Your active stake:{" "}
                {activeStake?.status === "active"
                  ? `${formatStakeSol(activeStake.amountSol)} SOL`
                  : "None"}
              </p>
              {!canRegister && eligibility?.blockReason ? (
                <p className="mt-2 text-amber-200">{eligibility.blockReason}</p>
              ) : null}
              {!canRegister ? (
                <Link
                  href="/staking"
                  className="mt-3 inline-block text-sm text-accent hover:underline"
                >
                  Go to Staking →
                </Link>
              ) : null}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="node-id" className="block text-sm text-content-secondary">
                Node ID
              </label>
              <input
                id="node-id"
                type="text"
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                placeholder="e.g. 4e099787-24e8-4746-894d-5c56ddef2a58"
                className="mt-2 w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 font-mono text-sm text-content-primary placeholder:text-gray-600 focus:border-accent focus:outline-none"
                required
                minLength={3}
                maxLength={128}
                disabled={submitting || !canRegister}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !nodeId.trim() || !canRegister}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-muted disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
                  Registering…
                </>
              ) : (
                "Register node"
              )}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
