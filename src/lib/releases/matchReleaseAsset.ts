import type { OperatingSystem } from "@/lib/detectOS";

export type GuiOsKey = "windows" | "macos" | "linux";

export interface ReleaseDownload {
  name: string;
  url: string;
}

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

const GUI_OS_KEYS: GuiOsKey[] = ["windows", "macos", "linux"];

function matchesGuiAsset(name: string, os: GuiOsKey): boolean {
  const lower = name.toLowerCase();
  if (!lower.includes("aicw-node-setup")) return false;

  switch (os) {
    case "windows":
      return lower.includes("windows") && lower.endsWith(".exe");
    case "linux":
      return lower.includes("linux") && lower.endsWith(".zip");
    case "macos":
      return lower.includes("darwin") && lower.endsWith(".zip");
    default:
      return false;
  }
}

export function operatingSystemToGuiKey(os: OperatingSystem): GuiOsKey {
  if (os === "windows" || os === "macos" || os === "linux") return os;
  return "linux";
}

export function pickGuiDownload(
  assets: ReleaseAsset[],
  os: OperatingSystem,
): ReleaseDownload | null {
  const key = operatingSystemToGuiKey(os);
  const asset = assets.find((item) => matchesGuiAsset(item.name, key));
  if (!asset) return null;

  return {
    name: asset.name,
    url: asset.browser_download_url,
  };
}

export function pickAllGuiDownloads(
  assets: ReleaseAsset[],
): Partial<Record<GuiOsKey, ReleaseDownload>> {
  const downloads: Partial<Record<GuiOsKey, ReleaseDownload>> = {};

  for (const os of GUI_OS_KEYS) {
    const asset = assets.find((item) => matchesGuiAsset(item.name, os));
    if (!asset) continue;
    downloads[os] = {
      name: asset.name,
      url: asset.browser_download_url,
    };
  }

  return downloads;
}
