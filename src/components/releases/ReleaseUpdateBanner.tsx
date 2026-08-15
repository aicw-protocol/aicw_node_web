"use client";

import { useEffect, useState } from "react";

interface LatestReleaseResponse {
  tagName: string;
  latestVersion: string;
  releasesUrl: string;
  publishedAt: string | null;
}

const DISMISS_KEY_PREFIX = "aicw-release-dismissed:";

function dismissKey(tagName: string): string {
  return `${DISMISS_KEY_PREFIX}${tagName}`;
}

export function ReleaseUpdateBanner() {
  const [release, setRelease] = useState<LatestReleaseResponse | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/releases/latest", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: LatestReleaseResponse | null) => {
        if (cancelled || !json?.tagName) return;
        const dismissed = window.localStorage.getItem(dismissKey(json.tagName)) === "1";
        setRelease(json);
        setVisible(!dismissed);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !release) return null;

  return (
    <div
      role="status"
      className="border-b border-surface-border bg-surface-panel/90 px-4 py-[7px] text-sm text-content-secondary"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-medium text-content-primary">
            AICW Node v{release.latestVersion} is available
          </span>
          <span className="text-content-muted"> — download the latest desktop app.</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={release.releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-neutral-200 px-3 py-0.5 text-sm font-medium leading-tight text-black transition hover:bg-neutral-300"
          >
            Download v{release.latestVersion}
          </a>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(dismissKey(release.tagName), "1");
              setVisible(false);
            }}
            className="text-sm text-content-muted transition hover:text-content-primary"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
