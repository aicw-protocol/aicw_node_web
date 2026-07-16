"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletMultiButton } from "@solana/wallet-adapter-base-ui";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { truncateAddress } from "@/lib/formatWallet";

type WalletButtonLayout = "default" | "compact" | "sidebar";

interface WalletButtonProps {
  layout?: WalletButtonLayout;
}

const SHELL_CLASS: Record<WalletButtonLayout, string> = {
  sidebar:
    "w-full min-h-[62px] rounded-lg px-5 text-sm leading-none",
  compact: "min-h-8 rounded-lg px-5 text-xs leading-none",
  default: "min-h-10 rounded-lg px-5 text-sm leading-none",
};

function WalletAddressChip({
  address,
  onDisconnect,
  layout,
  truncateChars,
  className = "",
}: {
  address: string;
  onDisconnect: () => void;
  layout: WalletButtonLayout;
  truncateChars?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center border border-surface-border bg-surface pr-8 font-mono text-content-secondary ${SHELL_CLASS[layout]} ${className}`}
      title={address}
    >
      <span className="min-w-0 flex-1 truncate">
        {truncateAddress(address, truncateChars)}
      </span>
      <button
        type="button"
        onClick={onDisconnect}
        className="absolute right-1.5 top-1.5 rounded p-0.5 text-content-muted transition hover:text-red-400"
        aria-label="Disconnect wallet"
      >
        <i className="fa-solid fa-right-from-bracket text-[0.65rem]" aria-hidden />
      </button>
    </div>
  );
}

export function WalletButton({ layout = "default" }: WalletButtonProps) {
  const { publicKey, disconnect, connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { buttonState, onConnect } = useWalletMultiButton({
    onSelectWallet() {
      setVisible(true);
    },
  });

  const handleConnect = () => {
    if (buttonState === "has-wallet" && onConnect) {
      onConnect();
      return;
    }

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
    const address = publicKey.toBase58();

    return (
      <WalletAddressChip
        address={address}
        onDisconnect={() => void handleDisconnect()}
        layout={layout}
        truncateChars={layout === "compact" ? 3 : undefined}
        className="bg-surface-panel"
      />
    );
  }

  const showConnectLabel = layout !== "compact";

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={connecting}
      className={`flex items-center justify-center gap-2 bg-accent font-medium text-white transition hover:opacity-90 disabled:opacity-60 ${SHELL_CLASS[layout]}`}
    >
      {connecting ? (
        <>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          {showConnectLabel ? <span>Connecting…</span> : null}
        </>
      ) : (
        <>
          <i className="fa-solid fa-wallet" aria-hidden />
          {showConnectLabel ? <span>Connect Wallet</span> : null}
        </>
      )}
    </button>
  );
}
