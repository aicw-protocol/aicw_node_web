"use client";

import { useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import type { WalletError } from "@solana/wallet-adapter-base";
import { getSolanaRpcUrl } from "@/lib/solanaCluster";

import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => getSolanaRpcUrl(), []);
  const wallets = useMemo(() => [new LedgerWalletAdapter()], []);

  const onError = useCallback((error: WalletError) => {
    console.error("Wallet error:", error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
