"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { NodeRecord } from "@/lib/db/types";
import { latLngToUnitVector } from "@/lib/globeMapSampler";
import { isNodePingActive } from "@/lib/nodePing";

const GLOBE_RADIUS = 1.015;
const MARKER_COLOR = "#00ffcc";
const CLUSTER_DISTANCE_DEG = 2;

interface GlobeNodeMarkersProps {
  nodes: NodeRecord[];
  markerRadius: number;
}

interface NodeCluster {
  lat: number;
  lon: number;
  count: number;
}

function clusterNodes(
  nodes: { latitude: number; longitude: number }[],
): NodeCluster[] {
  const clusters: NodeCluster[] = [];

  for (const node of nodes) {
    const existing = clusters.find(
      (c) =>
        Math.abs(c.lat - node.latitude) < CLUSTER_DISTANCE_DEG &&
        Math.abs(c.lon - node.longitude) < CLUSTER_DISTANCE_DEG,
    );

    if (existing) {
      existing.lat = (existing.lat * existing.count + node.latitude) / (existing.count + 1);
      existing.lon = (existing.lon * existing.count + node.longitude) / (existing.count + 1);
      existing.count += 1;
    } else {
      clusters.push({ lat: node.latitude, lon: node.longitude, count: 1 });
    }
  }

  return clusters;
}

function ClusterMarker({
  cluster,
  markerRadius,
}: {
  cluster: NodeCluster;
  markerRadius: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(
    () => latLngToUnitVector(cluster.lat, cluster.lon).multiplyScalar(GLOBE_RADIUS),
    [cluster.lat, cluster.lon],
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const aura = auraRef.current;
    if (!mesh || !aura) return;

    const t = clock.elapsedTime * 1.2;
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI);
    
    const meshMat = mesh.material as THREE.MeshBasicMaterial;
    meshMat.opacity = 0.7 + pulse * 0.3;

    const auraCycle = (t % 1.5) / 1.5;
    const auraScale = 1 + auraCycle * 3;
    const auraOpacity = 0.4 * (1 - auraCycle);
    
    aura.scale.setScalar(auraScale);
    const auraMat = aura.material as THREE.MeshBasicMaterial;
    auraMat.opacity = auraOpacity;
  });

  const baseSize = markerRadius * 2;

  return (
    <group position={position}>
      {/* Invisible hover target (larger for easier interaction) */}
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[baseSize * 6, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Main dot */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[baseSize, 8, 8]} />
        <meshBasicMaterial
          color={MARKER_COLOR}
          transparent
          opacity={1}
          toneMapped={false}
        />
      </mesh>
      {/* Expanding aura */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[baseSize, 10, 10]} />
        <meshBasicMaterial
          color={MARKER_COLOR}
          transparent
          opacity={0.4}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {/* Node count tooltip */}
      {hovered && (
        <Html
          center
          style={{
            pointerEvents: "none",
            transition: "opacity 0.2s ease",
          }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.75)",
              color: MARKER_COLOR,
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              border: `1px solid ${MARKER_COLOR}`,
            }}
          >
            {cluster.count}
          </div>
        </Html>
      )}
    </group>
  );
}

export function GlobeNodeMarkers({ nodes, markerRadius }: GlobeNodeMarkersProps) {
  const clusters = useMemo(() => {
    const activeNodes = nodes.filter(
      (node) =>
        node.latitude !== null &&
        node.longitude !== null &&
        isNodePingActive(node.lastPingAt),
    );

    return clusterNodes(
      activeNodes.map((n) => ({
        latitude: n.latitude!,
        longitude: n.longitude!,
      })),
    );
  }, [nodes]);

  return (
    <>
      {clusters.map((cluster, i) => (
        <ClusterMarker
          key={`${cluster.lat}-${cluster.lon}-${i}`}
          cluster={cluster}
          markerRadius={markerRadius}
        />
      ))}
    </>
  );
}
