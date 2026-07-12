"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { NodeListResponse } from "@/lib/db/types";
import { isNodePingActive } from "@/lib/nodePing";
import { GlobeWorldMap } from "@/components/nodes/GlobeWorldMap";
import { LiveCounter } from "@/components/nodes/LiveCounter";
import { RecentRegistrationTicker } from "@/components/nodes/RecentRegistrationTicker";

type HeroState = "loading" | "ready" | "error" | "unconfigured";

export function NodesHero() {
  const [state, setState] = useState<HeroState>("loading");
  const [data, setData] = useState<NodeListResponse | null>(null);

  const loadNodes = useCallback(async () => {
    try {
      const res = await fetch("/api/nodes", { cache: "no-store" });
      if (res.status === 503) {
        setState("unconfigured");
        return;
      }
      if (!res.ok) throw new Error("failed");
      setData((await res.json()) as NodeListResponse);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    const onUpdate = () => {
      loadNodes();
    };
    window.addEventListener("aicw-node-registered", onUpdate);
    return () => window.removeEventListener("aicw-node-registered", onUpdate);
  }, [loadNodes]);

  const stats = data?.stats ?? { total: 0, activeRegistered: 0 };
  const nodes = data?.nodes ?? [];
  const showGlobe = state === "ready" || state === "loading";

  return (
    <section className="relative h-[min(78vh,720px)] min-h-[440px] w-full select-none overflow-hidden border-b border-surface-border bg-[var(--color-hero-bg)] sm:min-h-[500px] sm:h-[min(84vh,780px)] lg:min-h-[520px] lg:h-[min(88vh,820px)]">
      <div className="absolute inset-0 z-0 h-full">
        {showGlobe ? (
          <GlobeWorldMap nodes={nodes} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--color-globe-bg)] text-sm text-content-muted">
            {state === "unconfigured" && "Database not configured"}
            {state === "error" && "Failed to load map"}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] hidden bg-gradient-to-r from-[var(--color-hero-gradient)] via-[var(--color-hero-gradient)]/88 to-transparent lg:block lg:max-w-[52%]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[62%] bg-gradient-to-t from-[var(--color-hero-gradient)] via-[var(--color-hero-gradient)]/70 to-transparent sm:h-[58%] lg:hidden" />

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-end px-4 pb-7 pt-20 sm:px-8 sm:pb-10 lg:max-w-[44%] lg:px-12 lg:pb-12 lg:pt-28">
        <div className="w-full max-w-page">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent">
            Global Network
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-content-primary sm:text-5xl lg:text-6xl">
            AICW Nodes{" "}
            <span className="bg-gradient-to-r from-accent via-emerald-300 to-accent-muted bg-clip-text text-transparent">
              Worldwide
            </span>
          </h1>

          <div className="mt-8 flex flex-wrap items-end gap-8 sm:gap-12">
            <LiveCounter label="Total registered" value={stats.total} />
            <LiveCounter
              label="Active"
              value={nodes.filter((node) => isNodePingActive(node.lastPingAt)).length}
              accent="emerald"
            />
          </div>

          <div className="mt-6 min-h-[1.5rem]">
            <RecentRegistrationTicker nodes={nodes} />
          </div>

          <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:bg-accent-muted"
            >
              Register your node
              <i className="fa-solid fa-arrow-right ml-2" aria-hidden />
            </Link>
            <Link
              href="/staking"
              className="inline-flex items-center rounded-lg border border-surface-border bg-surface/80 px-5 py-3 text-sm text-content-secondary backdrop-blur-sm transition hover:border-accent/40 hover:text-content-primary"
            >
              View staking curve
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
