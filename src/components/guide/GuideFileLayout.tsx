export function GuideFileLayout() {
  return (
    <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-sm text-content-secondary">
      <p>AICW Node/ (default on Windows)</p>
      <p className="ml-4 text-content-muted">%LOCALAPPDATA%\Programs\AICW Node\</p>
      <p className="ml-4">├── aicw-node.exe</p>
      <p className="ml-4">├── network-config.yaml</p>
      <p className="ml-4">├── password.txt</p>
      <p className="ml-4">├── operator-config.yaml</p>
      <p className="ml-4">└── identity/</p>
      <p className="ml-8">├── my_node_01_identity.json</p>
      <p className="ml-8">└── my_node_01_private_key.txt</p>
      <p className="mt-2 text-xs text-content-muted">
        The desktop app creates these files when you register a node. Use{" "}
        <strong className="text-content-secondary">Install Folder</strong> in the app to open this directory.
      </p>
    </div>
  );
}
