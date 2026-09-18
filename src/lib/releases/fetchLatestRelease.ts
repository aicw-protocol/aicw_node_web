import { getOnboardingConfig } from "@/lib/onboardingConfig";
import {
  pickAllGuiDownloads,
  type GuiOsKey,
  type ReleaseDownload,
} from "@/lib/releases/matchReleaseAsset";
import { normalizeVersion } from "@/lib/releases/version";

export interface LatestReleaseInfo {
  tagName: string;
  latestVersion: string;
  releasesUrl: string;
  publishedAt: string | null;
  downloads: Partial<Record<GuiOsKey, ReleaseDownload>>;
}

const DEFAULT_REPO = "aicw-protocol/aicw_node";
function repoFromReleasesUrl(releasesUrl: string): string {
  const match = releasesUrl.match(/github\.com\/([^/]+\/[^/]+)\/releases/i);
  return match?.[1] ?? DEFAULT_REPO;
}

function releasePageUrl(releasesUrl: string, tagName: string): string {
  const base = releasesUrl.replace(/\/$/, "");
  if (base.includes("/releases/tag/")) {
    return `${base.split("/releases")[0]}/releases/tag/${encodeURIComponent(tagName)}`;
  }
  return `${base}/tag/${encodeURIComponent(tagName)}`;
}

export async function fetchLatestRelease(): Promise<LatestReleaseInfo | null> {
  const { releasesUrl } = getOnboardingConfig();
  const repo = repoFromReleasesUrl(releasesUrl);
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "aicw-node-web",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      tag_name?: string;
      html_url?: string;
      published_at?: string;
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };

    const tagName = data.tag_name?.trim();
    if (!tagName) return null;

    const assets = (data.assets ?? [])
      .filter(
        (asset): asset is { name: string; browser_download_url: string } =>
          Boolean(asset.name?.trim() && asset.browser_download_url?.trim()),
      )
      .map((asset) => ({
        name: asset.name.trim(),
        browser_download_url: asset.browser_download_url.trim(),
      }));

    return {
      tagName,
      latestVersion: normalizeVersion(tagName),
      releasesUrl: data.html_url?.trim() || releasePageUrl(releasesUrl, tagName),
      publishedAt: data.published_at ?? null,
      downloads: pickAllGuiDownloads(assets),
    };
  } catch {
    return null;
  }
}
