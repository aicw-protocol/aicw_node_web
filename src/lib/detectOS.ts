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

/** Returns the actual release binary filename from GitHub Releases. */
export function getBinaryName(os: OperatingSystem): string {
  switch (os) {
    case "windows":
      return "aicw-node-windows-amd64.exe";
    case "macos":
      return "aicw-node-darwin-amd64";
    case "linux":
      return "aicw-node-linux-amd64";
    default:
      return "aicw-node";
  }
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
