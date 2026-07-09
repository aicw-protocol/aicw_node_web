"use client";

import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/PageShell";
import { NodesHero } from "@/components/nodes/NodesHero";
import { CollapsibleRegistry } from "@/components/nodes/CollapsibleRegistry";
import { PAGE_CONTAINER } from "@/lib/layout";

export default function NodesPage() {
  const [totalNodes, setTotalNodes] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/nodes", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { stats?: { total?: number } };
      setTotalNodes(json.stats?.total ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  useEffect(() => {
    const onUpdate = () => {
      loadCount();
    };
    window.addEventListener("aicw-node-registered", onUpdate);
    return () => window.removeEventListener("aicw-node-registered", onUpdate);
  }, [loadCount]);

  return (
    <AppLayout>
      <NodesHero />
      <div className={`${PAGE_CONTAINER} py-8 sm:py-10`}>
        <CollapsibleRegistry totalNodes={totalNodes} />
      </div>
    </AppLayout>
  );
}
