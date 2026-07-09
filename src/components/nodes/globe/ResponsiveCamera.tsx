"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";

interface ResponsiveCameraProps {
  cameraZ: number;
  cameraY: number;
  fov: number;
}

export function ResponsiveCamera({ cameraZ, cameraY, fov }: ResponsiveCameraProps) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, cameraY, cameraZ);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, cameraZ, cameraY, fov]);

  return null;
}
