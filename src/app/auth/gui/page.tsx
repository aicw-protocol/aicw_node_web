"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";

interface ChallengeResponse {
  message: string;
  challengeToken: string;
  wallet: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function GuiAuthContent() {
  const searchParams = useSearchParams();
  const callback = searchParams.get("callback")?.trim() ?? "";
  const { publicKey, connected, signMessage } = useWallet();
  const [status, setStatus] = useState<string>("Connect your wallet to continue.");
  const [busy, setBusy] = useState(false);

  const wallet = useMemo(
    () => (connected && publicKey ? publicKey.toBase58() : ""),
    [connected, publicKey],
  );

  const finishWithCallback = useCallback(
    async (payload: {
      wallet: string;
      message: string;
      challengeToken: string;
      signatureBase64: string;
    }) => {
      if (!callback) {
        setStatus("Signed in successfully. You can return to the AICW Node app.");
        return;
      }

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!verifyRes.ok) {
        const json = (await verifyRes.json()) as { error?: string };
        throw new Error(json.error ?? "Verification failed");
      }

      const url = new URL(callback);
      url.searchParams.set("wallet", payload.wallet);
      url.searchParams.set("message", payload.message);
      url.searchParams.set("challengeToken", payload.challengeToken);
      url.searchParams.set("signatureBase64", payload.signatureBase64);
      window.location.href = url.toString();
    },
    [callback],
  );

  const handleSignIn = useCallback(async () => {
    if (!wallet) {
      setStatus("Connect your wallet first.");
      return;
    }
    if (!signMessage) {
      setStatus("This wallet does not support message signing.");
      return;
    }

    setBusy(true);
    setStatus("Preparing secure login challenge…");

    try {
      const challengeRes = await fetch(
        `/api/auth/challenge?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" },
      );
      if (!challengeRes.ok) {
        throw new Error("Failed to create login challenge");
      }

      const challenge = (await challengeRes.json()) as ChallengeResponse;
      setStatus("Approve the sign-in request in your wallet…");

      const messageBytes = new TextEncoder().encode(challenge.message);
      const signature = await signMessage(messageBytes);

      await finishWithCallback({
        wallet: challenge.wallet,
        message: challenge.message,
        challengeToken: challenge.challengeToken,
        signatureBase64: bytesToBase64(signature),
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }, [finishWithCallback, signMessage, wallet]);

  useEffect(() => {
    if (connected && wallet) {
      setStatus(`Wallet connected: ${wallet.slice(0, 4)}…${wallet.slice(-4)}`);
    }
  }, [connected, wallet]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-content-primary">AICW Node Desktop Sign-In</h1>
        <p className="mt-2 text-sm text-content-secondary">
          Sign in with your Solana wallet to link the desktop app with your staking and node
          registration on AICW Node Web.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <WalletButton layout="default" />
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={!connected || busy}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in for Desktop App"}
          </button>
        </div>

        <p className="mt-4 text-sm text-content-muted">{status}</p>

        {!callback ? (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-300">
            Open this page from the AICW Node desktop app so it can receive the signed login
            callback.
          </p>
        ) : null}

        <div className="mt-6 space-y-2 text-xs text-content-muted">
          <p>Recommended onboarding:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Stake on the Staking page if required.</li>
            <li>Register your node on the Dashboard.</li>
            <li>Return to the desktop app to start your node.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function GuiAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-content-secondary">
          Loading sign-in…
        </div>
      }
    >
      <GuiAuthContent />
    </Suspense>
  );
}
