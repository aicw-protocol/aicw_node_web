"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { truncateAddress } from "@/lib/formatWallet";

type WalletButtonLayout = "default" | "compact" | "sidebar";

interface WalletButtonProps {
  layout?: WalletButtonLayout;
}

export function WalletButton({ layout = "default" }: WalletButtonProps) {
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Wallet disconnected");
    } catch {
      toast.error("Failed to disconnect wallet");
    }
  };

  if (connected && publicKey) {
    if (layout === "sidebar") {
      return (
        <div className="space-y-2">
          <div
            className="rounded-lg border border-surface-border bg-surface px-3 py-2 font-mono text-xs text-content-secondary"
            title={publicKey.toBase58()}
          >
            {truncateAddress(publicKey.toBase58())}
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-content-secondary transition hover:border-red-500/50 hover:text-red-400"
            aria-label="Disconnect wallet"
          >
            <i className="fa-solid fa-right-from-bracket" aria-hidden />
            Disconnect
          </button>
        </div>
      );
    }

    if (layout === "compact") {
      return (
        <button
          type="button"
          onClick={handleDisconnect}
          className="rounded-lg border border-surface-border bg-surface-panel px-2.5 py-1.5 font-mono text-xs text-content-secondary transition hover:border-red-500/50 hover:text-red-400"
          title={`${publicKey.toBase58()} — click to disconnect`}
          aria-label="Disconnect wallet"
        >
          {truncateAddress(publicKey.toBase58(), 3)}
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden rounded-lg border border-surface-border bg-surface-panel px-3 py-2 font-mono text-sm text-content-secondary sm:inline-block"
          title={publicKey.toBase58()}
        >
          {truncateAddress(publicKey.toBase58())}
        </span>
        <button
          type="button"
          onClick={handleDisconnect}
          className="rounded-lg border border-surface-border bg-surface-panel px-3 py-2 text-sm text-content-secondary transition hover:border-red-500/50 hover:text-red-400"
          aria-label="Disconnect wallet"
        >
          <span className="sm:hidden">{truncateAddress(publicKey.toBase58(), 3)}</span>
          <span className="hidden sm:inline">
            <i className="fa-solid fa-right-from-bracket mr-1.5" aria-hidden />
            Disconnect
          </span>
        </button>
      </div>
    );
  }

  const connectClass =
    layout === "sidebar"
      ? "flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      : layout === "compact"
        ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        : "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={connecting}
      className={connectClass}
    >
      {connecting ? (
        <>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          {layout === "compact" ? null : <span className="ml-2">Connecting…</span>}
        </>
      ) : (
        <>
          <i className="fa-solid fa-wallet" aria-hidden />
          {layout === "compact" ? null : <span className="ml-2">Connect Wallet</span>}
        </>
      )}
    </button>
  );
}