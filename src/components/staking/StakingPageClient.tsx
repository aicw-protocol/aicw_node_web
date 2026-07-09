"use client";

import { useCallback, useEffect, useState } from "react";
import { AppLayout, PageShell } from "@/components/PageShell";
import { StakingCurveChart } from "@/components/staking/StakingCurveChart";
import {
  StakingPanel,
  type CurveResponse,
} from "@/components/staking/StakingPanel";

export default function StakingPageClient() {
  const [curve, setCurve] = useState<CurveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurve = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staking/curve", { cache: "no-store" });
      if (res.ok) {
        setCurve((await res.json()) as CurveResponse);
      } else {
        setCurve(null);
      }
    } catch {
      setCurve(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurve();
  }, [loadCurve]);

  useEffect(() => {
    const refresh = () => {
      loadCurve();
    };
    window.addEventListener("aicw-staking-updated", refresh);
    return () => window.removeEventListener("aicw-staking-updated", refresh);
  }, [loadCurve]);

  return (
    <AppLayout>
      <PageShell
        title="Staking"
        description="Stake SOL when required by the dynamic fee curve. Chart and charges use the same shared formula."
      >
        <div className="space-y-8">
          {loading ? (
            <div className="rounded-xl border border-surface-border bg-surface-panel p-8 text-center text-sm text-content-secondary">
              Loading curve…
            </div>
          ) : curve ? (
            <StakingCurveChart
              points={curve.points}
              registeredNodeCount={curve.registeredNodeCount}
              requiredStakeSol={curve.requiredStakeSol}
            />
          ) : null}
          <StakingPanel />
        </div>
      </PageShell>
    </AppLayout>
  );
}
