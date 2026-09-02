"use client";

import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/PageShell";
import { NodesHero } from "@/components/nodes/NodesHero";
import { CollapsibleRegistry } from "@/components/nodes/CollapsibleRegistry";
import type { NodesLoadState } from "@/components/nodes/types";
import type { NodeListResponse } from "@/lib/db/types";
import { PAGE_CONTAINER } from "@/lib/layout";

export default function NodesPage() {
  const [loadState, setLoadState] = useState<NodesLoadState>("loading");
  const [data, setData] = useState<NodeListResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNodes = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/nodes", { cache: "no-store" });
      if (res.status === 503) {
        setLoadState("unconfigured");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load nodes");
      setData((await res.json()) as NodeListResponse);
      setLoadState("ready");
    } catch {
      setLoadState("error");
      setErrorMessage("Could not load nodes from the database.");
    }
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    const onUpdate = () => loadNodes();
    window.addEventListener("aicw-node-registered", onUpdate);
    return () => window.removeEventListener("aicw-node-registered", onUpdate);
  }, [loadNodes]);

  return (
    <AppLayout>
      <NodesHero data={data} loadState={loadState} />
      <div className={`${PAGE_CONTAINER} py-8 sm:py-10`}>
        <CollapsibleRegistry
          data={data}
          loadState={loadState}
          errorMessage={errorMessage}
          onReload={loadNodes}
        />
      </div>
    </AppLayout>
  );
}
