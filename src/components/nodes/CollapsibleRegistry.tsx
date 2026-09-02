"use client";

import { useState } from "react";
import { NodesOverview } from "@/components/nodes/NodesOverview";
import type { NodesLoadState } from "@/components/nodes/types";
import type { NodeListResponse } from "@/lib/db/types";

interface CollapsibleRegistryProps {
  data: NodeListResponse | null;
  loadState: NodesLoadState;
  errorMessage: string | null;
  onReload: () => Promise<void>;
}

export function CollapsibleRegistry({
  data,
  loadState,
  errorMessage,
  onReload,
}: CollapsibleRegistryProps) {
  const [open, setOpen] = useState(false);
  const totalNodes = data?.stats.total ?? 0;

  const nodeCountLabel =
    totalNodes === 0
      ? "No nodes registered yet"
      : totalNodes === 1
        ? "1 node on the network"
        : `${totalNodes} nodes on the network`;

  return (
    <section className="rounded-xl border border-surface-border bg-surface-panel/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface-panel/80"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-medium text-content-primary">All registered nodes</h2>
          <p className="mt-1 text-sm text-content-secondary">{nodeCountLabel}</p>
        </div>
        <span className="flex items-center gap-2 text-sm text-content-secondary">
          {open ? "Hide" : "Show"}
          <i
            className={`fa-solid fa-chevron-down transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div className="border-t border-surface-border px-2 pb-4 pt-2 sm:px-4">
          <NodesOverview
            data={data}
            loadState={loadState}
            errorMessage={errorMessage}
            onReload={onReload}
            hideStats
          />
        </div>
      ) : null}
    </section>
  );
}
