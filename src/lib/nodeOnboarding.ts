import type { NodeIdentityFiles } from "./nodeIdentity";

export interface OperatorConfigInput {
  nodeWebUrl: string;
  pingIntervalSeconds: number;
}

/** Build operator-config.yaml snippet with node_web ping pre-filled. */
export function buildOperatorConfigYaml(input: OperatorConfigInput): string {
  const baseUrl = input.nodeWebUrl.trim().replace(/\/$/, "");
  const urlLine = baseUrl
    ? `  url: "${baseUrl}"`
    : '  url: ""  # e.g. http://localhost:4003 or https://node.aicw.ai';

  return `# Operator-local overrides (merge with network-config.yaml from your network admin)
db_path: "."
backup_enabled: true
backup_period_seconds: 300
backup_dir: backups
max_concurrent_keygen: 2
max_concurrent_signing: 10

healthcheck:
  enabled: false
  address: "0.0.0.0:8080"

# Report liveness to the AICW node web dashboard (referral selection).
node_web:
  ping_enabled: true
${urlLine}
  ping_interval_seconds: ${input.pingIntervalSeconds}
`;
}

/** Shell command to start the node with downloaded files. */
export function buildStartCommand(nodeName: string): string {
  return [
    `aicw-node start --name ${nodeName}`,
    "--network-config network-config.yaml",
    "--config operator-config.yaml",
    "--identity-dir ./identity",
    "-f password.txt",
  ].join(" ");
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadNodeBundle(
  identity: NodeIdentityFiles,
  operatorConfigYaml: string,
): void {
  downloadTextFile(identity.identityFilename, identity.identityJson);
  downloadTextFile(identity.privateKeyFilename, identity.privateKeyHex);
  downloadTextFile("operator-config.yaml", operatorConfigYaml);
}
