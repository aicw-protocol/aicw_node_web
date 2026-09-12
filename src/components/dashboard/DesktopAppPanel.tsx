"use client";

import Link from "next/link";
import { formatStakeSol } from "@/lib/stakingCurve";
import type { StakingRecord } from "@/lib/db/types";
import { useLatestReleaseDownload } from "@/hooks/useLatestReleaseDownload";

interface RegistrationEligibility {
  registeredNodeCount: number;
  requiredStakeSol: number;
  canRegister: boolean;
  blockReason: string | null;
}

interface DesktopAppPanelProps {
  eligibility: RegistrationEligibility;
  activeStake?: StakingRecord | null;
}

export function DesktopAppPanel({
  eligibility,
  activeStake = null,
}: DesktopAppPanelProps) {
  const { osLabel, latestVersion, releasesUrl, download } = useLatestReleaseDownload();

  const required = eligibility.requiredStakeSol ?? 0;
  const canRegister = eligibility.canRegister ?? true;
  const downloadHref = download?.url ?? releasesUrl;
  const versionLabel = latestVersion ? ` (v${latestVersion})` : "";

  return (
    <section className="rounded-xl border border-surface-border bg-surface-panel p-6">
      <h2 className="text-lg font-medium text-content-primary">Run a node</h2>
      <p className="mt-2 text-sm text-content-secondary">
        Node registration, local setup, and start/stop now happen in the{" "}
        <strong className="text-content-primary">AICW Node desktop app</strong>. This
        website is for staking, your dashboard, and network status.
      </p>

      {required <= 0 ? (
        <p className="mt-4 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Staking not required yet — fewer than 30 nodes are registered globally.
        </p>
      ) : (
        <div className="mt-4 rounded-lg border border-surface-border bg-surface/60 px-4 py-3 text-sm text-content-secondary">
          <p>
            Required stake for next node:{" "}
            <span className="font-medium text-content-primary">
              {formatStakeSol(required)} SOL
            </span>
          </p>
          <p className="mt-1">
            Your active stake:{" "}
            {activeStake?.status === "active"
              ? `${formatStakeSol(activeStake.amountSol)} SOL`
              : "None"}
          </p>
          {!canRegister && eligibility.blockReason ? (
            <p className="mt-2 text-amber-700 dark:text-amber-200">{eligibility.blockReason}</p>
          ) : null}
          {!canRegister ? (
            <Link
              href="/staking"
              className="mt-3 inline-block text-sm text-accent hover:underline"
            >
              Go to Staking →
            </Link>
          ) : null}
        </div>
      )}

      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-content-secondary">
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
        <li>Sign in with the same wallet you use here.</li>
        <li>Click <strong className="text-content-primary">+ Register Node</strong> in the app.</li>
        <li>Start the node from the app and return here to verify status.</li>
      </ol>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={downloadHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-muted"
        >
          <i className="fa-solid fa-download mr-2" aria-hidden />
          Download for {osLabel}
          {latestVersion ? ` (v${latestVersion})` : ""}
        </a>
        <Link
          href="/guide#quick-start"
          className="inline-flex items-center rounded-lg border border-surface-border px-4 py-2.5 text-sm text-content-secondary transition hover:border-accent/40 hover:text-content-primary"
        >
          Setup guide
        </Link>
      </div>
    </section>
  );
}
