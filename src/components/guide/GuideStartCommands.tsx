"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  detectOS,
  getAllStartCommands,
  getBinaryName,
  NODE_NAME_PLACEHOLDER,
  type OperatingSystem,
} from "@/lib/detectOS";
import { readLastNodeName } from "@/lib/lastNodeName";
import type { NodeRecord } from "@/lib/db/types";

export function GuideStartCommands() {
  const { publicKey, connected } = useWallet();
  const [os, setOs] = useState<OperatingSystem>("unknown");
  const [nodeName, setNodeName] = useState<string | null>(null);

  const resolveNodeName = useCallback(async () => {
    if (connected && publicKey) {
      try {
        const res = await fetch(
          `/api/dashboard?wallet=${encodeURIComponent(publicKey.toBase58())}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as { nodes?: NodeRecord[] };
          const named = (data.nodes ?? [])
            .filter((node) => node.nodeName?.trim())
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          if (named[0]?.nodeName) {
            setNodeName(named[0].nodeName);
            return;
          }
        }
      } catch {
        // fall through to session storage
      }
    }

    setNodeName(readLastNodeName());
  }, [connected, publicKey]);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  useEffect(() => {
    void resolveNodeName();
  }, [resolveNodeName]);

  const displayName = nodeName?.trim() || NODE_NAME_PLACEHOLDER;
  const commands = getAllStartCommands(displayName);
  const detectedBinary = os !== "unknown" ? getBinaryName(os) : null;
  const usingPlaceholder = displayName === NODE_NAME_PLACEHOLDER;

  return (
    <div className="mt-3 space-y-3">
      {commands.map((item) => {
        const isRecommended =
          detectedBinary !== null && item.binary === detectedBinary;

        return (
          <div
            key={`${item.label}-${item.binary}`}
            className={`rounded-lg border p-3 ${
              isRecommended
                ? "border-accent/50 bg-accent/5"
                : "border-surface-border bg-gray-900"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium text-content-primary">
                {item.label}
              </span>
              {isRecommended && (
                <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
                  Your OS
                </span>
              )}
            </div>
            <code className="block overflow-x-auto font-mono text-sm text-emerald-300">
              {item.command}
            </code>
          </div>
        );
      })}
      <p className="text-xs text-content-muted">
        {usingPlaceholder ? (
          <>
            Replace{" "}
            <code className="text-content-secondary">{NODE_NAME_PLACEHOLDER}</code>{" "}
            with the <strong className="text-content-secondary">Node name</strong>{" "}
            you entered when creating your node on the Dashboard (e.g.{" "}
            <code className="text-content-secondary">ko_node_01</code>).
          </>
        ) : (
          <>
            Using your Node name{" "}
            <code className="text-content-secondary">{displayName}</code> from the
            Dashboard. It must match the name in your identity filenames.
          </>
        )}
      </p>
    </div>
  );
}
