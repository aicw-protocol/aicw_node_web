"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CurvePoint } from "@/lib/stakingCurve";
import { formatStakeSol, STAKE_EXP_GROWTH_RATE } from "@/lib/stakingCurve";

interface StakingCurveChartProps {
  points: CurvePoint[];
  registeredNodeCount: number;
  requiredStakeSol: number;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CurvePoint }[];
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel px-3 py-2 text-xs shadow-lg">
      <p className="text-content-secondary">
        Nodes registered: <span className="text-content-primary">{point.nodeCount}</span>
      </p>
      <p className="text-content-secondary">
        Next stake:{" "}
        <span className="text-content-primary">{formatStakeSol(point.requiredStakeSol)} SOL</span>
      </p>
    </div>
  );
}

export function StakingCurveChart({
  points,
  registeredNodeCount,
  requiredStakeSol,
}: StakingCurveChartProps) {
  const chartData = points.map((p) => ({
    ...p,
    label: p.nodeCount,
  }));

  return (
    <div className="rounded-xl border border-surface-border bg-surface-panel p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-content-primary">Staking fee curve</h2>
          <p className="text-sm text-content-secondary">
            X: registered nodes · Y: required stake for the next node (SOL)
          </p>
        </div>
        <p className="text-sm text-content-secondary">
          Current:{" "}
          <span className="font-medium text-content-primary">{registeredNodeCount}</span> nodes ·{" "}
          <span className="font-medium text-accent">
            {formatStakeSol(requiredStakeSol)} SOL
          </span>
        </p>
      </div>

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#252c3a" strokeDasharray="3 3" />
            <XAxis
              dataKey="nodeCount"
              stroke="#6b7280"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              label={{
                value: "Registered nodes",
                position: "insideBottom",
                offset: -2,
                fill: "#6b7280",
                fontSize: 11,
              }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(v) => formatStakeSol(Number(v))}
              label={{
                value: "SOL",
                angle: -90,
                position: "insideLeft",
                fill: "#6b7280",
                fontSize: 11,
              }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="requiredStakeSol"
              stroke="#7c8cff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#9c7cff" }}
            />
            <ReferenceLine
              x={registeredNodeCount}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{
                value: "Now",
                fill: "#22c55e",
                fontSize: 11,
                position: "insideTopLeft",
              }}
            />
            <ReferenceDot
              x={registeredNodeCount}
              y={requiredStakeSol}
              r={5}
              fill="#22c55e"
              stroke="#141924"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-content-muted">
        Nodes 1–30: 0 SOL. From node 31: 0.002 × e^({STAKE_EXP_GROWTH_RATE} × (n − 31)) SOL.
      </p>
    </div>
  );
}
