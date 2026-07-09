"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Color } from "three";

interface SceneBackgroundProps {
  color: string;
}

export function SceneBackground({ color }: SceneBackgroundProps) {
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.setClearColor(color, 1);
    scene.background = new Color(color);
  }, [gl, scene, color]);

  return <color attach="background" args={[color]} />;
}
