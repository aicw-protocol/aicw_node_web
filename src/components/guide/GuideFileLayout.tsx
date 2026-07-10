import { NODE_NAME_PLACEHOLDER, RELEASE_BINARIES } from "@/lib/detectOS";

export function GuideFileLayout() {
  return (
    <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-sm text-content-secondary">
      <p>my-node/</p>
      <p className="ml-4">
        ├── {RELEASE_BINARIES.windows}{" "}
        <span className="text-content-muted">(Windows)</span>
      </p>
      <p className="ml-4">
        ├── {RELEASE_BINARIES.linux}{" "}
        <span className="text-content-muted">(Linux x64)</span>
      </p>
      <p className="ml-4">
        ├── {RELEASE_BINARIES.macosIntel}{" "}
        <span className="text-content-muted">(macOS Intel)</span>
      </p>
      <p className="ml-4">
        ├── {RELEASE_BINARIES.macosAppleSilicon}{" "}
        <span className="text-content-muted">(macOS Apple Silicon)</span>
      </p>
      <p className="ml-4">├── operator-config.yaml</p>
      <p className="ml-4">├── network-config.yaml</p>
      <p className="ml-4">├── password.txt</p>
      <p className="ml-4">└── identity/</p>
      <p className="ml-8">├── {NODE_NAME_PLACEHOLDER}_identity.json</p>
      <p className="ml-8">└── {NODE_NAME_PLACEHOLDER}_private_key.txt</p>
      <p className="mt-2 text-xs text-content-muted">
        Download only the binary that matches your operating system.
      </p>
    </div>
  );
}
