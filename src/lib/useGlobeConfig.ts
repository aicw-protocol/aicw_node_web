"use client";

import { useEffect, useRef, useState } from "react";
import type { Theme } from "@/components/theme/ThemeProvider";

export interface GlobeVisualConfig {
  background: string;
  landColor: string;
  oceanColor: string;
  dotRadius: number;
  markerRadius: number;
  latStep: number;
  lonStep: number;
  cameraZ: number;
  cameraY: number;
  fov: number;
  globeOffsetX: number;
}

type ViewportTier = "sm" | "md" | "lg";

function getViewportTier(width: number): ViewportTier {
  if (width < 640) return "sm";
  if (width < 1024) return "md";
  return "lg";
}

function themeColors(theme: Theme) {
  return theme === "light"
    ? {
        background: "#d4d9e2",
        landColor: "#6d7788",
        oceanColor: "#3a4352",
      }
    : {
        background: "#070b14",
        landColor: "#b0b8c4",
        oceanColor: "#3d4552",
      };
}

function tierSettings(tier: ViewportTier) {
  switch (tier) {
    case "sm":
      return {
        latStep: 1.75,
        lonStep: 2.0,
        dotRadius: 0.00375,
        markerRadius: 0.014,
        cameraZ: 2.85,
        cameraY: 0.06,
        fov: 54,
      };
    case "md":
      return {
        latStep: 1.25,
        lonStep: 1.5,
        dotRadius: 0.00325,
        markerRadius: 0.012,
        cameraZ: 2.5,
        cameraY: 0.1,
        fov: 50,
      };
    default:
      return {
        latStep: 1.0,
        lonStep: 1.25,
        dotRadius: 0.00275,
        markerRadius: 0.011,
        cameraZ: 2.15,
        cameraY: 0.14,
        fov: 46,
      };
  }
}

function adjustForAspect(
  config: Pick<GlobeVisualConfig, "cameraZ" | "fov">,
  aspect: number,
): Pick<GlobeVisualConfig, "cameraZ" | "fov"> {
  if (aspect <= 1.15) {
    return config;
  }

  const wideFactor = aspect - 1;
  return {
    cameraZ: config.cameraZ * (1 + wideFactor * 0.28),
    fov: Math.min(58, config.fov + wideFactor * 6),
  };
}

const GLOBE_OFFSET_3D = 0.7;

export function buildGlobeConfig(
  theme: Theme,
  width: number,
  aspect = width / Math.max(width * 0.55, 320),
): GlobeVisualConfig {
  const tier = getViewportTier(width);
  const base = { ...themeColors(theme), ...tierSettings(tier) };
  const camera = adjustForAspect(
    { cameraZ: base.cameraZ, fov: base.fov },
    aspect,
  );

  return { ...base, ...camera, globeOffsetX: GLOBE_OFFSET_3D };
}

export function useGlobeConfig(theme: Theme, containerWidth: number, containerHeight: number) {
  const aspect = containerHeight > 0 ? containerWidth / containerHeight : 1;
  const [config, setConfig] = useState<GlobeVisualConfig>(() =>
    buildGlobeConfig(theme, containerWidth || 1280, aspect),
  );

  useEffect(() => {
    setConfig(buildGlobeConfig(theme, containerWidth || window.innerWidth, aspect));
  }, [theme, containerWidth, containerHeight, aspect]);

  return config;
}

export function useContainerSize() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(node);
    setSize({ width: node.clientWidth, height: node.clientHeight });

    return () => observer.disconnect();
  }, []);

  return { containerRef, ...size };
}
