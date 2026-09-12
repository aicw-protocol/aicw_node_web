"use client";

import { useEffect, useState } from "react";
import {
  detectOS,
  getNodeEngineName,
  getOSLabel,
  type OperatingSystem,
} from "@/lib/detectOS";

export function GuideFileLayout() {
  const [os, setOs] = useState<OperatingSystem>("unknown");

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const engineName = getNodeEngineName(os);
  const osLabel = getOSLabel(os);
  const pathHint =
    os === "windows"
      ? "%LOCALAPPDATA%\\Programs\\AICW Node\\"
      : os === "macos"
        ? "~/Library/Application Support/AICW Node/"
        : "~/.config/AICW Node/";

  return (
    <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-sm text-content-secondary">
      <p>
        AICW Node/ (default on {os === "unknown" ? "your OS" : osLabel})
      </p>
      <p className="ml-4 text-content-muted">{pathHint}</p>
      <p className="ml-4">├── {engineName}</p>
      <p className="ml-4">├── network-config.yaml</p>
      <p className="ml-4">├── password.txt</p>
      <p className="ml-4">├── operator-config.yaml</p>
      <p className="ml-4">└── identity/</p>
      <p className="ml-8">├── my_node_01_identity.json</p>
      <p className="ml-8">└── my_node_01_private_key.txt</p>
      <p className="mt-2 text-xs text-content-muted">
        The desktop app creates these files when you register a node. Use{" "}
        <strong className="text-content-secondary">Install Folder</strong> in the app to
        open this directory.
      </p>
    </div>
  );
}
