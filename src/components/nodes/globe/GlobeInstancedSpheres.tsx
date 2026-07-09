"use client";

import { useMemo } from "react";
import { Instance, Instances } from "@react-three/drei";
import type { GlobePoint } from "@/lib/globeMapSampler";
import { latLngToUnitVector } from "@/lib/globeMapSampler";

const GLOBE_RADIUS = 1;

interface GlobeInstancedSpheresProps {
  points: GlobePoint[];
  dotRadius: number;
  landColor: string;
  oceanColor: string;
}

function PointInstances({
  points,
  dotRadius,
  color,
}: {
  points: GlobePoint[];
  dotRadius: number;
  color: string;
}) {
  if (points.length === 0) return null;

  return (
    <Instances limit={points.length} range={points.length} frustumCulled={false}>
      <sphereGeometry args={[dotRadius, 6, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      {points.map((point, index) => {
        const position = latLngToUnitVector(point.lat, point.lon).multiplyScalar(GLOBE_RADIUS);
        return (
          <Instance
            key={`${point.lat.toFixed(2)}-${point.lon.toFixed(2)}-${index}`}
            position={position}
          />
        );
      })}
    </Instances>
  );
}

export function GlobeInstancedSpheres({
  points,
  dotRadius,
  landColor,
  oceanColor,
}: GlobeInstancedSpheresProps) {
  const { landPoints, oceanPoints } = useMemo(
    () => ({
      landPoints: points.filter((point) => point.kind === "land"),
      oceanPoints: points.filter((point) => point.kind === "ocean"),
    }),
    [points],
  );

  if (points.length === 0) return null;

  return (
    <>
      <PointInstances points={oceanPoints} dotRadius={dotRadius} color={oceanColor} />
      <PointInstances points={landPoints} dotRadius={dotRadius} color={landColor} />
    </>
  );
}
