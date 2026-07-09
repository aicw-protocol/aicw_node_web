"use client";

import "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { NodeRecord } from "@/lib/db/types";
import {
  buildGlobePoints,
  loadLandGrid,
  WORLD_LAND_GRID_URL,
  type GlobePoint,
  type LandGrid,
} from "@/lib/globeMapSampler";
import { useContainerSize, useGlobeConfig } from "@/lib/useGlobeConfig";
import { useTheme } from "@/components/theme/ThemeProvider";
import { GlobeInstancedSpheres } from "./GlobeInstancedSpheres";
import { GlobeNodeMarkers } from "./GlobeNodeMarkers";
import { ResponsiveCamera } from "./ResponsiveCamera";
import { SceneBackground } from "./SceneBackground";

interface GlobeSceneProps {
  nodes: NodeRecord[];
  points: GlobePoint[];
  autoRotate: boolean;
  config: ReturnType<typeof useGlobeConfig>;
}

function GlobeScene({ nodes, points, autoRotate, config }: GlobeSceneProps) {
  const offsetX = config.globeOffsetX;
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(offsetX, 0, 0);
      controlsRef.current.update();
    }
  }, [offsetX]);

  return (
    <>
      <SceneBackground color={config.background} />
      <ResponsiveCamera
        cameraZ={config.cameraZ}
        cameraY={config.cameraY}
        fov={config.fov}
      />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 3, 4]} intensity={0.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} />
      <group position={[offsetX, 0, 0]}>
        <GlobeInstancedSpheres
          points={points}
          dotRadius={config.dotRadius}
          landColor={config.landColor}
          oceanColor={config.oceanColor}
        />
        <GlobeNodeMarkers nodes={nodes} markerRadius={config.dotRadius} />
      </group>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.75}
        autoRotate={autoRotate}
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.88}
      />
    </>
  );
}

interface GlobeCanvasProps {
  nodes: NodeRecord[];
  className?: string;
}

export function GlobeCanvas({ nodes, className = "" }: GlobeCanvasProps) {
  const { theme } = useTheme();
  const { containerRef, width, height } = useContainerSize();
  const config = useGlobeConfig(theme, width, height);
  const [landGrid, setLandGrid] = useState<LandGrid | null>(null);
  const [points, setPoints] = useState<GlobePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAutoRotate(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLandGrid(WORLD_LAND_GRID_URL)
      .then((grid) => {
        if (cancelled) return;
        setLandGrid(grid);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load land grid");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!landGrid) return;

    const id = window.setTimeout(() => {
      setPoints(buildGlobePoints(landGrid, config.latStep, config.lonStep));
      setLoading(false);
    }, 0);

    return () => window.clearTimeout(id);
  }, [landGrid, config.latStep, config.lonStep]);

  const statusLabel = useMemo(() => {
    if (error) return error;
    if (loading || !points) return "Loading 3D world map…";
    return `3D globe — ${points.length} spheres from Natural Earth land data`;
  }, [error, loading, points]);

  const ready = points && !error && !loading;

  return (
    <div
      ref={containerRef}
      className={`relative h-full min-h-[260px] w-full overflow-hidden ${className}`}
      style={{ backgroundColor: config.background }}
    >
      {ready ? (
        <Canvas
          className="h-full w-full touch-none"
          camera={{ position: [0, config.cameraY, config.cameraZ], fov: config.fov, near: 0.1, far: 20 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%", display: "block", transform: "translateX(100px)" }}
        >
          <GlobeScene nodes={nodes} points={points} autoRotate={autoRotate} config={config} />
        </Canvas>
      ) : (
        <div
          className="flex h-full min-h-[260px] items-center justify-center text-sm text-content-muted"
          style={{ backgroundColor: config.background }}
        >
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            <>
              <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
              {statusLabel}
            </>
          )}
        </div>
      )}
      <span className="sr-only">{statusLabel}</span>
    </div>
  );
}
