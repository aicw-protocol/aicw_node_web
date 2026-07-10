"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { formatStakeSol, lamportsFromSol, meetsMinimumStake } from "@/lib/stakingCurve";
import { generateNodeIdentity, validateNodeName } from "@/lib/nodeIdentity";
import type { NodeIdentityFiles } from "@/lib/nodeIdentity";
import { downloadNodeBundle, buildOperatorConfigYaml } from "@/lib/nodeOnboarding";
import { saveLastNodeName } from "@/lib/lastNodeName";
import type { OnboardingConfig } from "@/lib/onboardingConfig";
import type { StakingRecord } from "@/lib/db/types";
import { OnboardingWizard } from "./OnboardingWizard";

interface RegistrationEligibility {
  registeredNodeCount: number;
  requiredStakeSol: number;
  canRegister: boolean;
  blockReason: string | null;
}

interface CurveResponse {
  requiredStakeSol: number;
  treasuryWallet: string | null;
  freeNodeThreshold: number;
}

interface CreateNodeFlowProps {
  eligibility?: RegistrationEligibility | null;
  activeStake?: StakingRecord | null;
  onCreated?: () => void;
}

type FlowStep = "form" | "creating" | "wizard";

async function getOptionalGeolocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

export function CreateNodeFlow({
  eligibility = null,
  activeStake = null,
  onCreated,
}: CreateNodeFlowProps) {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [nodeName, setNodeName] = useState("");
  const [step, setStep] = useState<FlowStep>("form");
  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig | null>(
    null,
  );
  const [createdIdentity, setCreatedIdentity] = useState<NodeIdentityFiles | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const canRegister = eligibility?.canRegister ?? true;
  const required = eligibility?.requiredStakeSol ?? 0;

  useEffect(() => {
    fetch("/api/onboarding/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setOnboardingConfig(json as OnboardingConfig);
      })
      .catch(() => {});
  }, []);

  const ensureStakeIfNeeded = useCallback(
    async (requiredStake: number): Promise<boolean> => {
      if (requiredStake <= 0) return true;
      if (!connected || !publicKey) return false;

      const hasSufficient =
        activeStake?.status === "active" &&
        meetsMinimumStake(activeStake.amountSol, requiredStake);
      if (hasSufficient) return true;

      const curveRes = await fetch("/api/staking/curve", { cache: "no-store" });
      if (!curveRes.ok) {
        toast.error("Failed to load staking configuration");
        return false;
      }
      const curve = (await curveRes.json()) as CurveResponse;
      if (!curve.treasuryWallet) {
        toast.error("Staking treasury wallet is not configured");
        return false;
      }

      toast.loading(`Staking ${formatStakeSol(requiredStake)} SOL…`, { id: "create-stake" });

      try {
        const lamports = lamportsFromSol(requiredStake);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(curve.treasuryWallet),
            lamports,
          }),
        );

        const signature = await sendTransaction(transaction, connection as Connection);
        const latest = await connection.getLatestBlockhash("confirmed");
        await connection.confirmTransaction({ signature, ...latest }, "confirmed");

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

        toast.success(`Staked ${formatStakeSol(requiredStake)} SOL`, { id: "create-stake" });
        window.dispatchEvent(new Event("aicw-staking-updated"));
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Staking transaction failed";
        toast.error(message, { id: "create-stake" });
        return false;
      }
    },
    [activeStake, connected, connection, publicKey, sendTransaction],
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    if (!connected || !publicKey) {
      toast.error("Connect your wallet to create a node");
      return;
    }

    const nameError = validateNodeName(nodeName);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    if (eligibility && !eligibility.canRegister && required > 0) {
      toast.error(eligibility.blockReason ?? "Not eligible to create a node");
      return;
    }

    setSubmitting(true);
    setStep("creating");

    try {
      const identity = await generateNodeIdentity(nodeName);
      const stakeOk = await ensureStakeIfNeeded(required);
      if (!stakeOk) {
        setStep("form");
        return;
      }

      const geo = await getOptionalGeolocation();

      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: identity.nodeId,
          nodeName: identity.nodeName,
          publicKey: identity.publicKey,
          ownerWallet: publicKey.toBase58(),
          ...(geo ? { latitude: geo.latitude, longitude: geo.longitude } : {}),
        }),
      });

      const json = (await res.json()) as { error?: string; node?: { nodeId: string } };

      if (!res.ok) {
        toast.error(json.error ?? "Node registration failed");
        setStep("form");
        return;
      }

      const config = onboardingConfig ?? {
        nodeWebUrl: "",
        pingIntervalSeconds: 90,
        releasesUrl: "https://github.com/aicw-protocol/aicw_node/releases",
      };

      const operatorYaml = buildOperatorConfigYaml({
        nodeWebUrl: config.nodeWebUrl,
        pingIntervalSeconds: config.pingIntervalSeconds,
      });

      downloadNodeBundle(identity, operatorYaml);
      saveLastNodeName(identity.nodeName);

      setCreatedIdentity(identity);
      setStep("wizard");
      setNodeName("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create node failed";
      toast.error(message);
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWizardClose = () => {
    setStep("form");
    setCreatedIdentity(null);
    window.dispatchEvent(new Event("aicw-node-registered"));
    onCreated?.();
  };

  if (step === "wizard" && createdIdentity) {
    const config = onboardingConfig ?? {
      nodeWebUrl: "",
      pingIntervalSeconds: 90,
      releasesUrl: "https://github.com/aicw-protocol/aicw_node/releases",
    };

    return (
      <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
        <OnboardingWizard
          identity={createdIdentity}
          config={config}
          onClose={handleWizardClose}
        />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
      <h2 className="text-lg font-medium text-content-primary">Create node</h2>
      <p className="mt-2 text-sm text-content-secondary">
        Generates your node identity in the browser (same format as{" "}
        <code className="text-content-secondary">aicw-node init</code>), registers the node ID
        in the database, and downloads identity files plus a pre-filled{" "}
        <code className="text-content-secondary">operator-config.yaml</code>. Your private key
        never leaves your browser.
      </p>

      {!connected ? (
        <p className="mt-4 rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm text-content-secondary">
          <i className="fa-solid fa-wallet mr-2 text-accent" aria-hidden />
          Connect your wallet to create a node.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {required <= 0 ? (
            <p className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Staking not required yet — fewer than 30 nodes are registered globally.
            </p>
          ) : (
            <div className="rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm text-content-secondary">
              <p>
                Required stake for next node:{" "}
                <span className="font-medium text-content-primary">
                  {formatStakeSol(required)} SOL
                </span>
                {required > 0 && canRegister ? " — will stake automatically if needed" : ""}
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

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="node-name" className="block text-sm text-content-secondary">
                Node name
              </label>
              <input
                id="node-name"
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="e.g. alice"
                className="mt-2 w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 font-mono text-sm text-content-primary placeholder:text-gray-600 focus:border-accent focus:outline-none"
                required
                minLength={2}
                maxLength={64}
                disabled={submitting}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-content-muted">
                Used for identity filenames and the start command. Must match the name you
                pass to <code>aicw-node start --name</code>.
              </p>
            </div>
            <p className="text-xs text-content-muted">
              <i className="fa-solid fa-location-dot mr-1.5" aria-hidden />
              Allow location access when prompted to display your node on the map.
            </p>

            <button
              type="submit"
              disabled={submitting || !nodeName.trim()}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-muted disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
                  {step === "creating" ? "Creating node…" : "Processing…"}
                </>
              ) : (
                "Create node"
              )}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
