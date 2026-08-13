"use client";

import { useEffect, useState } from "react";
import {
  GITHUB_RELEASES_URL,
  detectOS,
  getGUIBinaryName,
  getGUIInstallPath,
  getNodeEngineName,
  getOSLabel,
  type OperatingSystem,
} from "@/lib/detectOS";

interface GuideDesktopDownloadProps {
  variant?: "inline" | "steps" | "button";
  className?: string;
}

export function GuideDesktopDownload({
  variant = "inline",
  className = "",
}: GuideDesktopDownloadProps) {
  const [os, setOs] = useState<OperatingSystem>("unknown");
  const [releasesUrl, setReleasesUrl] = useState(GITHUB_RELEASES_URL);

  useEffect(() => {
    setOs(detectOS());
    fetch("/api/onboarding/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.releasesUrl) setReleasesUrl(String(json.releasesUrl));
      })
      .catch(() => {});
  }, []);

  const guiName = getGUIBinaryName(os);
  const engineName = getNodeEngineName(os);
  const installPath = getGUIInstallPath(os);
  const osLabel = getOSLabel(os);

  if (variant === "button") {
    return (
      <a
        href={releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        Download desktop app
        <i className="fa-solid fa-arrow-right ml-2" />
      </a>
    );
  }

  if (variant === "steps") {
    return (
      <ol className={`list-inside list-decimal space-y-2 text-sm text-content-secondary ${className}`}>
        <li>
          Download{" "}
          <code className="text-content-primary">{guiName}</code> from{" "}
          <a
            href={releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            GitHub Releases
          </a>
          .
        </li>
        {os === "macos" ? (
          <>
            <li>Unzip the downloaded file and move AICW Node.app to Applications.</li>
            <li>Open the app and accept the license on first launch.</li>
          </>
        ) : os === "linux" ? (
          <>
            <li>
              Make it executable:{" "}
              <code className="text-content-primary">chmod +x {guiName}</code>
            </li>
            <li>Run the app and accept the license.</li>
          </>
        ) : (
          <>
            <li>Run the installer and accept the license.</li>
            <li>
              Choose an install folder (default:{" "}
              <code className="text-content-primary">{installPath}</code>
              ).
            </li>
          </>
        )}
        <li>
          The app copies{" "}
          <code className="text-content-primary">{engineName}</code> into{" "}
          <code className="text-content-primary">{installPath}</code> automatically.
        </li>
      </ol>
    );
  }

  return (
    <p className={className}>
      Download{" "}
      <code className="text-content-primary">{guiName}</code> for{" "}
      <span className="text-content-primary">{osLabel}</span> from{" "}
      <a
        href={releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
      >
        GitHub Releases
      </a>
      . The desktop app handles install, wallet sign-in, node registration, local
      config files, and start/stop.
    </p>
  );
}
