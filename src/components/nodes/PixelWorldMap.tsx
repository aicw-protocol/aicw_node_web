"use client";

import { useEffect, useRef } from "react";
import type { NodeRecord } from "@/lib/db/types";
import {
  isLand,
  LAND_PIXEL,
  MAP_HEIGHT,
  MAP_WIDTH,
  NODE_PIXEL,
  projectLatLng,
} from "@/lib/worldMapLand";

interface PixelWorldMapProps {
  nodes: NodeRecord[];
  className?: string;
}

function drawLandPixels(ctx: CanvasRenderingContext2D) {
  for (let lat = -90; lat <= 90; lat += 2) {
    for (let lon = -180; lon <= 180; lon += 2) {
      if (!isLand(lat, lon)) continue;
      const { x, y } = projectLatLng(lat, lon, MAP_WIDTH, MAP_HEIGHT);
      const px = Math.floor(x / LAND_PIXEL) * LAND_PIXEL;
      const py = Math.floor(y / LAND_PIXEL) * LAND_PIXEL;

      ctx.fillStyle = "#3d4f68";
      ctx.fillRect(px, py, LAND_PIXEL, LAND_PIXEL);

      if ((px + py) % 6 === 0) {
        ctx.fillStyle = "#5a7094";
        ctx.fillRect(px, py, LAND_PIXEL, LAND_PIXEL);
      }
    }
  }
}

function drawOceanGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(124, 140, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < MAP_HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_WIDTH, y);
    ctx.stroke();
  }
}

export function PixelWorldMap({ nodes, className = "" }: PixelWorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef(nodes);
  const burstUntilRef = useRef<Map<number, number>>(new Map());
  const seenIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    const now = performance.now();

    if (!initializedRef.current) {
      for (const node of nodes) {
        seenIdsRef.current.add(node.id);
      }
      initializedRef.current = true;
    } else {
      for (const node of nodes) {
        if (!seenIdsRef.current.has(node.id)) {
          seenIdsRef.current.add(node.id);
          burstUntilRef.current.set(node.id, now + 4000);
        }
      }
    }

    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.imageSmoothingEnabled = false;

    const landCanvas = document.createElement("canvas");
    landCanvas.width = MAP_WIDTH;
    landCanvas.height = MAP_HEIGHT;
    const landCtx = landCanvas.getContext("2d");
    if (landCtx) {
      landCtx.imageSmoothingEnabled = false;
      drawLandPixels(landCtx);
    }

    let raf = 0;
    const start = performance.now();

    const render = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.fillStyle = "#06080f";
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      drawOceanGrid(ctx);

      if (landCtx) {
        ctx.drawImage(landCanvas, 0, 0);
      }

      for (const node of nodesRef.current) {
        if (node.latitude === null || node.longitude === null) continue;

        const { x, y } = projectLatLng(
          node.latitude,
          node.longitude,
          MAP_WIDTH,
          MAP_HEIGHT,
        );
        const px = Math.round(x - NODE_PIXEL / 2);
        const py = Math.round(y - NODE_PIXEL / 2);

        const isActive = node.status === "registered";
        const pulse = isActive ? 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4)) : 0.35;

        const burstUntil = burstUntilRef.current.get(node.id) ?? 0;
        const bursting = now < burstUntil;
        if (burstUntil > 0 && !bursting) {
          burstUntilRef.current.delete(node.id);
        }

        if (bursting) {
          const burstPhase = (burstUntil - now) / 4000;
          const ring = NODE_PIXEL + 10 * (1 - burstPhase);
          ctx.fillStyle = `rgba(124, 255, 180, ${0.15 * burstPhase})`;
          ctx.fillRect(px - ring / 2, py - ring / 2, ring, ring);
        }

        if (isActive) {
          ctx.fillStyle = `rgba(124, 140, 255, ${pulse * 0.45})`;
          ctx.fillRect(px - 3, py - 3, NODE_PIXEL + 6, NODE_PIXEL + 6);
        }

        ctx.fillStyle = isActive
          ? `rgba(110, 255, 190, ${pulse})`
          : "rgba(100, 100, 100, 0.5)";
        ctx.fillRect(px, py, NODE_PIXEL, NODE_PIXEL);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      className={`block h-full w-full object-cover object-center ${className}`}
      aria-label="Pixel map of registered AICW nodes worldwide"
    />
  );
}
