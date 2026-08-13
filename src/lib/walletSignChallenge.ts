"use client";

import type { Adapter } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { SolanaSignMessage } from "@solana/wallet-standard-features";

export interface WalletChallengeResponse {
  message: string;
  challengeToken: string;
  wallet: string;
}

export interface SignedWalletChallenge {
  wallet: string;
  message: string;
  challengeToken: string;
  signatureBase64: string;
  signedMessageBase64?: string;
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
        signMessage: (input: {
          account: { address: string; publicKey: Uint8Array; features: string[] };
          message: Uint8Array;
        }) => Promise<Array<{ signature: Uint8Array; signedMessage: Uint8Array }>>;
      }
    >;
  };
} {
  return "standard" in adapter && adapter.standard === true && "wallet" in adapter;
}

async function signChallengeMessage(
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

export function walletCanSignMessages(
  adapter: Adapter | undefined,
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined,
): boolean {
  return (
    !!signMessage ||
    (!!adapter &&
      isStandardWalletAdapter(adapter) &&
      SolanaSignMessage in adapter.wallet.features)
  );
}

export async function fetchRegistrationChallenge(input: {
  wallet: string;
  nodeId: string;
  nodeName?: string;
  publicKey?: string;
}): Promise<WalletChallengeResponse> {
  const params = new URLSearchParams({
    wallet: input.wallet,
    purpose: "register",
    nodeId: input.nodeId,
  });
  if (input.nodeName?.trim()) {
    params.set("nodeName", input.nodeName.trim());
  }
  if (input.publicKey?.trim()) {
    params.set("publicKey", input.publicKey.trim());
  }

  const res = await fetch(`/api/auth/challenge?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    let errorMessage = "Failed to create registration challenge";
    try {
      const json = (await res.json()) as { error?: string };
      errorMessage = json.error ?? errorMessage;
    } catch {
      errorMessage = `Failed to create registration challenge (${res.status})`;
    }
    throw new Error(errorMessage);
  }

  return (await res.json()) as WalletChallengeResponse;
}

export async function signWalletChallenge(input: {
  adapter: Adapter | undefined;
  publicKey: PublicKey;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
  challenge: WalletChallengeResponse;
}): Promise<SignedWalletChallenge> {
  const messageBytes = new TextEncoder().encode(input.challenge.message);
  const signed = await signChallengeMessage(
    input.adapter,
    input.publicKey,
    input.signMessage,
    messageBytes,
  );

  return {
    wallet: input.challenge.wallet,
    message: input.challenge.message,
    challengeToken: input.challenge.challengeToken,
    signatureBase64: bytesToBase64(signed.signature),
    signedMessageBase64: signed.signedMessageBase64,
  };
}
