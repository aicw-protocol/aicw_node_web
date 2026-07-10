export type OperatingSystem = "windows" | "macos" | "linux" | "unknown";

export function detectOS(): OperatingSystem {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();

  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (platform.includes("mac") || ua.includes("macintosh")) return "macos";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";

  return "unknown";
}

export function getOSLabel(os: OperatingSystem): string {
  switch (os) {
    case "windows":
      return "Windows";
    case "macos":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return "Your OS";
  }
}

/** Release binary filenames from GitHub Releases (see aicw_node/.github/workflows/release.yml). */
export const RELEASE_BINARIES = {
  windows: "aicw-node-windows-amd64.exe",
  linux: "aicw-node-linux-amd64",
  linuxArm: "aicw-node-linux-arm64",
  macosIntel: "aicw-node-darwin-amd64",
  macosAppleSilicon: "aicw-node-darwin-arm64",
} as const;

/** Heuristic for Apple Silicon Macs (M1+) that report as MacIntel in the UA. */
export function detectMacArch(): "arm64" | "amd64" {
  if (typeof window === "undefined") return "amd64";
  const platform = (navigator.platform || "").toLowerCase();
  if (platform.includes("arm") || platform.includes("aarch")) return "arm64";
  // M-series Macs often report MacIntel with maxTouchPoints > 1
  if (platform.includes("mac") && navigator.maxTouchPoints > 1) return "arm64";
  return "amd64";
}

/** Returns the release binary filename for the detected OS. */
export function getBinaryName(os: OperatingSystem): string {
  switch (os) {
    case "windows":
      return RELEASE_BINARIES.windows;
    case "macos":
      return detectMacArch() === "arm64"
        ? RELEASE_BINARIES.macosAppleSilicon
        : RELEASE_BINARIES.macosIntel;
    case "linux":
      return RELEASE_BINARIES.linux;
    default:
      return RELEASE_BINARIES.linux;
  }
}

/** Placeholder in docs when the operator node name is not known yet. */
export const NODE_NAME_PLACEHOLDER = "<node-name>";

const START_ARGS =
  "--network-config network-config.yaml --config operator-config.yaml --identity-dir ./identity -f password.txt";

/** Full start command including OS-specific path prefix and release binary name. */
export function getStartCommand(
  os: OperatingSystem,
  nodeName = NODE_NAME_PLACEHOLDER,
): string {
  const binary = getBinaryName(os);
  const prefix = os === "windows" ? ".\\" : "./";
  return `${prefix}${binary} start --name ${nodeName} ${START_ARGS}`;
}

/** Start commands for all supported platforms (for static docs). */
export function getAllStartCommands(nodeName = NODE_NAME_PLACEHOLDER): Array<{
  os: OperatingSystem | "macos-arm";
  label: string;
  command: string;
  binary: string;
}> {
  return [
    {
      os: "windows",
      label: "Windows",
      binary: RELEASE_BINARIES.windows,
      command: `.\\${RELEASE_BINARIES.windows} start --name ${nodeName} ${START_ARGS}`,
    },
    {
      os: "linux",
      label: "Linux (x64)",
      binary: RELEASE_BINARIES.linux,
      command: `./${RELEASE_BINARIES.linux} start --name ${nodeName} ${START_ARGS}`,
    },
    {
      os: "linux",
      label: "Linux (ARM64)",
      binary: RELEASE_BINARIES.linuxArm,
      command: `./${RELEASE_BINARIES.linuxArm} start --name ${nodeName} ${START_ARGS}`,
    },
    {
      os: "macos",
      label: "macOS (Intel)",
      binary: RELEASE_BINARIES.macosIntel,
      command: `./${RELEASE_BINARIES.macosIntel} start --name ${nodeName} ${START_ARGS}`,
    },
    {
      os: "macos-arm",
      label: "macOS (Apple Silicon)",
      binary: RELEASE_BINARIES.macosAppleSilicon,
      command: `./${RELEASE_BINARIES.macosAppleSilicon} start --name ${nodeName} ${START_ARGS}`,
    },
  ];
}

export function getTerminalInstructions(os: OperatingSystem): string {
  switch (os) {
    case "windows":
      return "Press Win+R, type 'cmd', press Enter to open Command Prompt. Or search 'PowerShell' in Start menu.";
    case "macos":
      return "Press Cmd+Space, type 'Terminal', press Enter to open Terminal.";
    case "linux":
      return "Press Ctrl+Alt+T to open Terminal, or find it in your applications menu.";
    default:
      return "Open your system's terminal or command prompt.";
  }
}
