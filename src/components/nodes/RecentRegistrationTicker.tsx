"use client";

import { useEffect, useMemo, useState } from "react";
import type { NodeRecord } from "@/lib/db/types";
import { getRegionLabel } from "@/lib/worldMapLand";

function truncateNodeId(nodeId: string, chars = 8): string {
  if (nodeId.length <= chars * 2) return nodeId;
  return `${nodeId.slice(0, chars)}…${nodeId.slice(-chars)}`;
}

interface RecentRegistrationTickerProps {
  nodes: NodeRecord[];
}

export function RecentRegistrationTicker({ nodes }: RecentRegistrationTickerProps) {
  const items = useMemo(() => {
    return [...nodes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map((node) => {
        const region =
          node.latitude !== null && node.longitude !== null
            ? getRegionLabel(node.latitude, node.longitude)
            : "Unknown region";
        return {
          id: node.id,
          text: `Node ${truncateNodeId(node.nodeId)} registered · ${region}`,
        };
      });
  }, [nodes]);

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (items.length === 0) return undefined;
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 280);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <p className="font-mono text-xs text-content-muted">
        Waiting for the first registered node…
      </p>
    );
  }

  return (
    <p
      className={`font-mono text-xs text-emerald-200/90 transition-opacity duration-300 sm:text-sm ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      {items[index]?.text}
    </p>
  );
}
