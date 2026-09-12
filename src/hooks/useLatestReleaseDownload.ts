"use client";

import { useEffect, useState } from "react";
import {
  GITHUB_RELEASES_URL,
  detectOS,
  getGUIBinaryName,
  getOSLabel,
  type OperatingSystem,
} from "@/lib/detectOS";
import type { GuiOsKey, ReleaseDownload } from "@/lib/releases/matchReleaseAsset";
import { operatingSystemToGuiKey } from "@/lib/releases/matchReleaseAsset";

export interface LatestReleasePayload {
  tagName: string;
  latestVersion: string;
  releasesUrl: string;
  publishedAt: string | null;
  downloads: Partial<Record<GuiOsKey, ReleaseDownload>>;
}

interface LatestReleaseDownloadState {
  os: OperatingSystem;
  osLabel: string;
  latestVersion: string | null;
  releasesUrl: string;
  download: ReleaseDownload | null;
  fallbackName: string;
  ready: boolean;
}

export function useLatestReleaseDownload(): LatestReleaseDownloadState {
  const [os, setOs] = useState<OperatingSystem>("unknown");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releasesUrl, setReleasesUrl] = useState(GITHUB_RELEASES_URL);
  const [download, setDownload] = useState<ReleaseDownload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const detectedOs = detectOS();
    setOs(detectedOs);

    let cancelled = false;

    fetch("/api/releases/latest", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: LatestReleasePayload | null) => {
        if (cancelled) return;

        if (json?.releasesUrl) {
          setReleasesUrl(json.releasesUrl);
        }
        if (json?.latestVersion) {
          setLatestVersion(json.latestVersion);
        }

        const osKey = operatingSystemToGuiKey(detectedOs);
        const matched = json?.downloads?.[osKey] ?? null;
        setDownload(matched);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    os,
    osLabel: getOSLabel(os),
    latestVersion,
    releasesUrl,
    download,
    fallbackName: getGUIBinaryName(os),
    ready,
  };
}
