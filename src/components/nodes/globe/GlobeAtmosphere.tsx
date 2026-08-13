"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GLOBE_ATMOSPHERE_RADIUS } from "./globeConstants";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 glowColor;
  uniform float opacity;
  uniform float power;
  uniform float highlightStrength;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
    rim = pow(rim, power);

    // View-space upper-left key light — stays visually on the top-left of the globe.
    vec3 viewLight = normalize(vec3(-0.72, 0.84, 0.34));
    float facing = max(dot(vNormal, viewLight), 0.0);
    facing = pow(facing, 1.5);

    float alpha = rim * opacity * (1.0 + facing * highlightStrength);
    vec3 col = glowColor * (1.0 + facing * highlightStrength * 0.5);
    col += vec3(0.05, 0.06, 0.08) * facing * highlightStrength;

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

interface GlobeAtmosphereProps {
  color: string;
  opacity: number;
  highlightStrength?: number;
}

export function GlobeAtmosphere({
  color,
  opacity,
  highlightStrength = 0.48,
}: GlobeAtmosphereProps) {
  const uniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      power: { value: 5.2 },
      highlightStrength: { value: highlightStrength },
    }),
    [color, opacity, highlightStrength],
  );

  return (
    <mesh renderOrder={10}>
      <sphereGeometry args={[GLOBE_ATMOSPHERE_RADIUS, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        side={THREE.FrontSide}
        toneMapped={false}
      />
    </mesh>
  );
}
