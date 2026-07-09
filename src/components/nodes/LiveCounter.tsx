"use client";

import { useEffect, useRef, useState } from "react";

interface LiveCounterProps {
  label: string;
  value: number;
  accent?: "white" | "emerald";
}

export function LiveCounter({ label, value, accent = "white" }: LiveCounterProps) {
  const [bump, setBump] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setBump(true);
    const timer = window.setTimeout(() => setBump(false), 700);
    return () => window.clearTimeout(timer);
  }, [value]);

  const valueClass =
    accent === "emerald"
      ? "text-emerald-300"
      : "bg-gradient-to-r from-white to-accent bg-clip-text text-transparent";

  return (
    <div className="text-left">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-content-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums sm:text-4xl ${valueClass} ${
          bump ? "animate-counter-bump" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
