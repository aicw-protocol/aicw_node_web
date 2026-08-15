"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Adapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { SolanaSignMessage } from "@solana/wallet-standard-features";
import { WalletButton } from "@/components/WalletButton";

type GuiAuthPurpose =
  | "login"
  | "register"
  | "offboard"
  | "unstake"
  | "delete_node";

function parseGuiAuthPurpose(value: string): GuiAuthPurpose {
  switch (value) {
    case "register":
    case "offboard":
    case "unstake":
    case "delete_node":
      return value;
    default:
      return "login";
  }
}

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

function isStandardWalletAdapter(
  adapter: Adapter,
): adapter is Adapter & {
  standard: true;
  wallet: {
    accounts: Array<{ address: string; publicKey: Uint8Array; features: string[] }>;
    features: Record<
      typeof SolanaSignMessage,
      {
        signMessage: (
          input: { account: { address: string; publicKey: Uint8Array; features: string[] }; message: Uint8Array },
        ) => Promise<Array<{ signature: Uint8Array; signedMessage: Uint8Array }>>;
      }
    >;
  };
} {
  return "standard" in adapter && adapter.standard === true && "wallet" in adapter;
}

async function signGuiChallengeMessage(
  adapter: Adapter | undefined,
  publicKey: PublicKey,
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined,
  messageBytes: Uint8Array,
): Promise<{ signature: Uint8Array; signedMessageBase64?: string }> {
  if (adapter && isStandardWalletAdapter(adapter) && SolanaSignMessage in adapter.wallet.features) {
    const accounts = adapter.wallet.accounts ?? [];
    const account = accounts.find((entry) => {
      if (!entry?.address) return false;
      try {
        return new PublicKey(entry.address).equals(publicKey);
      } catch {
        return false;
      }
    });
    if (account) {
      const outputs = await adapter.wallet.features[SolanaSignMessage].signMessage({
        account,
        message: messageBytes,
      });
      const output = outputs[0];
      if (output?.signature && output?.signedMessage) {
        return {
          signature: output.signature,
          signedMessageBase64: bytesToBase64(output.signedMessage),
        };
      }
    }
  }

  if (!signMessage) {
    throw new Error("This wallet does not support message signing.");
  }

  const signature = await signMessage(messageBytes);
  return { signature };
}

function GuiAuthContent() {
  const searchParams = useSearchParams();
  const callback = searchParams.get("callback")?.trim() ?? "";
  const purposeParam = searchParams.get("purpose")?.trim() ?? "login";
  const purpose: GuiAuthPurpose = parseGuiAuthPurpose(purposeParam);
  const actionNodeId = searchParams.get("nodeId")?.trim() ?? "";
  const actionNodeName = searchParams.get("nodeName")?.trim() ?? "";
  const registerPublicKey = searchParams.get("publicKey")?.trim() ?? "";
  const isLogin = purpose === "login";
  const isRegister = purpose === "register";
  const requiresNodeId = purpose === "register" || purpose === "offboard" || purpose === "delete_node";
  const usesDesktopCallback = !isLogin;
  const { publicKey, connected, signMessage, wallet: activeWallet } = useWallet();
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
      signedMessageBase64?: string;
    }) => {
      if (usesDesktopCallback) {
        if (!callback) {
          throw new Error("Desktop action requires a callback URL.");
        }
        const url = new URL(callback);
        url.searchParams.set("wallet", payload.wallet);
        url.searchParams.set("message", payload.message);
        url.searchParams.set("challengeToken", payload.challengeToken);
        url.searchParams.set("signatureBase64", payload.signatureBase64);
        if (payload.signedMessageBase64) {
          url.searchParams.set("signedMessageBase64", payload.signedMessageBase64);
        }
        window.location.href = url.toString();
        return;
      }

      if (!callback) {
        window.location.assign("/dashboard");
        return;
      }

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!verifyRes.ok) {
        let errorMessage = "Verification failed";
        try {
          const json = (await verifyRes.json()) as { error?: string };
          errorMessage = json.error ?? errorMessage;
        } catch {
          errorMessage = `Verification failed (${verifyRes.status})`;
        }
        throw new Error(errorMessage);
      }

      const url = new URL(callback);
      url.searchParams.set("wallet", payload.wallet);
      url.searchParams.set("message", payload.message);
      url.searchParams.set("challengeToken", payload.challengeToken);
      url.searchParams.set("signatureBase64", payload.signatureBase64);
      if (payload.signedMessageBase64) {
        url.searchParams.set("signedMessageBase64", payload.signedMessageBase64);
      }
      window.location.href = url.toString();
    },
    [callback, usesDesktopCallback],
  );

  const actionTitle = (() => {
    switch (purpose) {
      case "register":
        return "AICW Node Desktop Registration";
      case "offboard":
        return "AICW Remove Node";
      case "unstake":
        return "AICW Request Stake Return";
      case "delete_node":
        return "AICW Remove Node";
      default:
        return "AICW Node Desktop Sign-In";
    }
  })();

  const actionDescription = (() => {
    switch (purpose) {
      case "register":
        return "Sign with your Solana wallet to register this node for your desktop app. Your node private key stays on this computer.";
      case "offboard":
        return "Sign with your Solana wallet to remove this node from the network. If it is your last node, staked SOL will be scheduled for return.";
      case "unstake":
        return "Sign with your Solana wallet to request return of staked SOL.";
      case "delete_node":
        return "Sign with your Solana wallet to remove this node from the network.";
      default:
        return "Sign in with your Solana wallet to link the desktop app with your staking and node registration on AICW Node Web.";
    }
  })();

  const prepareStatus = (() => {
    switch (purpose) {
      case "register":
        return "Preparing secure node registration challenge…";
      case "offboard":
        return "Preparing secure remove-node challenge…";
      case "unstake":
        return "Preparing secure stake-return challenge…";
      case "delete_node":
        return "Preparing secure remove-node challenge…";
      default:
        return "Preparing secure login challenge…";
    }
  })();

  const approveStatus = (() => {
    switch (purpose) {
      case "register":
        return "Approve the node registration request in your wallet…";
      case "offboard":
        return "Approve the remove-node request in your wallet…";
      case "unstake":
        return "Approve the stake-return request in your wallet…";
      case "delete_node":
        return "Approve the remove-node request in your wallet…";
      default:
        return "Approve the sign-in request in your wallet…";
    }
  })();

  const buttonLabel = (() => {
    switch (purpose) {
      case "register":
        return "Sign to Register Node";
      case "offboard":
        return "Sign to Remove Node";
      case "unstake":
        return "Sign to Request Stake Return";
      case "delete_node":
        return "Sign to Remove Node";
      default:
        return "Sign in for Desktop App";
    }
  })();

  const handleSignIn = useCallback(async () => {
    if (!wallet) {
      setStatus("Connect your wallet first.");
      return;
    }
    if (requiresNodeId && !actionNodeId) {
      setStatus(`${purpose} request is missing node ID.`);
      return;
    }
    if (!publicKey) {
      setStatus("Connect your wallet first.");
      return;
    }

    const adapter = activeWallet?.adapter;
    const canSign =
      !!signMessage ||
      (adapter &&
        isStandardWalletAdapter(adapter) &&
        SolanaSignMessage in adapter.wallet.features);
    if (!canSign) {
      setStatus("This wallet does not support message signing.");
      return;
    }

    setBusy(true);
    setStatus(prepareStatus);

    try {
      const challengeParams = new URLSearchParams({ wallet, purpose });
      if (requiresNodeId) {
        challengeParams.set("nodeId", actionNodeId);
      }
      if (actionNodeName) {
        challengeParams.set("nodeName", actionNodeName);
      }
      if (isRegister && registerPublicKey) {
        challengeParams.set("publicKey", registerPublicKey);
      }

      const challengeRes = await fetch(`/api/auth/challenge?${challengeParams.toString()}`, {
        cache: "no-store",
      });
      if (!challengeRes.ok) {
        throw new Error("Failed to create wallet challenge");
      }

      const challenge = (await challengeRes.json()) as ChallengeResponse;
      setStatus(approveStatus);

      const messageBytes = new TextEncoder().encode(challenge.message);
      const signed = await signGuiChallengeMessage(
        activeWallet?.adapter,
        publicKey!,
        signMessage,
        messageBytes,
      );

      await finishWithCallback({
        wallet: challenge.wallet,
        message: challenge.message,
        challengeToken: challenge.challengeToken,
        signatureBase64: bytesToBase64(signed.signature),
        signedMessageBase64: signed.signedMessageBase64,
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }, [
    actionNodeId,
    actionNodeName,
    activeWallet?.adapter,
    approveStatus,
    finishWithCallback,
    isRegister,
    prepareStatus,
    publicKey,
    purpose,
    registerPublicKey,
    requiresNodeId,
    signMessage,
    wallet,
  ]);

  useEffect(() => {
    if (connected && wallet) {
      setStatus(`Wallet connected: ${wallet.slice(0, 4)}…${wallet.slice(-4)}`);
    }
  }, [connected, wallet]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-surface-border bg-surface-panel p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-content-primary">
          {actionTitle}
        </h1>
        <p className="mt-2 text-sm text-content-secondary">
          {actionDescription}
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <WalletButton layout="default" />
          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={!connected || busy}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Signing…" : buttonLabel}
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
            <li>Install the AICW Node desktop app and sign in with your wallet.</li>
            <li>Register and start your node from the desktop app.</li>
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
