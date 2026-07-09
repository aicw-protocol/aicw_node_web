/** Public onboarding configuration (safe for client). */

export interface OnboardingConfig {
  nodeWebUrl: string;
  pingIntervalSeconds: number;
  releasesUrl: string;
}

export function getOnboardingConfig(): OnboardingConfig {
  const nodeWebUrl =
    process.env.NEXT_PUBLIC_NODE_WEB_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  const releasesUrl =
    process.env.NEXT_PUBLIC_AICW_NODE_RELEASES_URL?.trim() ||
    "https://github.com/aicw-protocol/aicw_node/releases";

  const pingIntervalRaw = process.env.NEXT_PUBLIC_NODE_PING_INTERVAL_SECONDS?.trim();
  const pingIntervalSeconds = pingIntervalRaw
    ? Math.max(30, Number.parseInt(pingIntervalRaw, 10) || 90)
    : 90;

  return {
    nodeWebUrl: nodeWebUrl.replace(/\/$/, ""),
    pingIntervalSeconds,
    releasesUrl,
  };
}
