"use client";

import { useMemo } from "react";
import type { NodeRecord } from "@/lib/db/types";
import { getRegionLabel } from "@/lib/worldMapLand";

const RECENT_NODE_LIMIT = 20;

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
      .slice(0, RECENT_NODE_LIMIT)
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

  if (items.length === 0) {
    return (
      <p className="font-mono text-xs text-content-muted">
        Waiting for the first registered node…
      </p>
    );
  }

  return (
    <ul className="max-h-[min(20rem,32vh)] space-y-1 overflow-y-auto pr-1 font-mono text-xs text-emerald-200/90 sm:text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          {item.text}
        </li>
      ))}
    </ul>
  );
}
