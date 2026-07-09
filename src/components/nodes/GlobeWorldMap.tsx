"use client";

import dynamic from "next/dynamic";
import type { NodeRecord } from "@/lib/db/types";

const GlobeCanvas = dynamic(
  () => import("./globe/GlobeCanvas").then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-surface text-sm text-content-muted">
        <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
        Loading 3D globe…
      </div>
    ),
  },
);

interface GlobeWorldMapProps {
  nodes: NodeRecord[];
  className?: string;
}

export function GlobeWorldMap({ nodes, className }: GlobeWorldMapProps) {
  return (
    <GlobeCanvas nodes={nodes} className={className} />
  );
}
