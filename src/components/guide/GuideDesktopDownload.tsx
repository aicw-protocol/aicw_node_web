"use client";

import { getGUIInstallPath, type OperatingSystem } from "@/lib/detectOS";
import { useLatestReleaseDownload } from "@/hooks/useLatestReleaseDownload";

interface GuideDesktopDownloadProps {
  variant?: "inline" | "inline-button" | "steps" | "button" | "platform-intro" | "cta-text";
  className?: string;
}

export function GuideDesktopDownload({
  variant = "inline",
  className = "",
}: GuideDesktopDownloadProps) {
  const { os, osLabel, latestVersion, releasesUrl, download, fallbackName } =
    useLatestReleaseDownload();

  const installerName = download?.name ?? fallbackName;
  const downloadHref = download?.url ?? releasesUrl;
  const installPath = getGUIInstallPath(os);
  const versionLabel = latestVersion ? ` (v${latestVersion})` : "";

  if (variant === "button") {
    return (
      <a
        href={downloadHref}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        Download desktop app
        {latestVersion ? ` v${latestVersion}` : ""}
        <i className="fa-solid fa-arrow-right ml-2" />
      </a>
    );
  }

  if (variant === "inline-button") {
    return (
      <div className={className}>
        <p className="text-sm text-content-secondary">
          Download the AICW Node desktop app for{" "}
          <span className="text-content-primary">{osLabel}</span>
          {versionLabel} from{" "}
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
        <a
          href={downloadHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-muted"
        >
          <i className="fa-brands fa-github mr-2" />
          Download for {osLabel}
          {latestVersion ? ` (v${latestVersion})` : ""}
        </a>
      </div>
    );
  }

  if (variant === "platform-intro") {
    const platformLabel =
      os === "unknown" ? "Windows, Linux, or macOS" : osLabel;

    return (
      <p className={className}>
        Step-by-step using the <strong>AICW Node desktop app</strong> on{" "}
        {os === "unknown" ? (
          platformLabel
        ) : (
          <strong>{platformLabel}</strong>
        )}
        . Staking still happens on this website; everything else runs in the app.
      </p>
    );
  }

  if (variant === "cta-text") {
    return (
      <p className={className}>
        Download the AICW Node desktop app for{" "}
        <span className="text-content-primary">{osLabel}</span>
        {versionLabel}, register your node, and track status on the dashboard.
      </p>
    );
  }

  if (variant === "steps") {
    return (
      <ol className={`list-inside list-decimal space-y-2 text-sm text-content-secondary ${className}`}>
        <li>
          Download the AICW Node desktop app for{" "}
          <strong className="text-content-primary">{osLabel}</strong>
          {versionLabel} from{" "}
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
        {renderInstallSteps(os, installerName)}
        <li>
          Node files are stored in{" "}
          <code className="text-content-primary">{installPath}</code>.
        </li>
      </ol>
    );
  }

  return (
    <p className={className}>
      Download the AICW Node desktop app for{" "}
      <span className="text-content-primary">{osLabel}</span>
      {versionLabel} from{" "}
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

function renderInstallSteps(os: OperatingSystem, installerName: string) {
  if (os === "macos") {
    return (
      <>
        <li>Unzip the downloaded file and move AICW Node.app to Applications.</li>
        <li>Open the app and accept the license on first launch.</li>
      </>
    );
  }

  if (os === "linux") {
    return (
      <>
        <li>
          Unzip the download, then:{" "}
          <code className="text-content-primary">
            chmod +x {installerName.replace(/\.zip$/i, "")} aicw-node
          </code>
        </li>
        <li>Run the setup app and accept the license.</li>
      </>
    );
  }

  return (
    <>
      <li>
        Run the downloaded installer
        {installerName ? (
          <>
            {" "}
            (<code className="text-content-primary">{installerName}</code>)
          </>
        ) : null}{" "}
        and follow the prompts.
      </li>
      <li>Open AICW Node from the Start menu or desktop shortcut and accept the license.</li>
    </>
  );
}
