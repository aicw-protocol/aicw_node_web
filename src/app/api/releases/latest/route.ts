import { NextResponse } from "next/server";
import { fetchLatestRelease } from "@/lib/releases/fetchLatestRelease";
import { isVersionNewer, normalizeVersion } from "@/lib/releases/version";

export const dynamic = "force-dynamic";

/** GET /api/releases/latest — latest GitHub GUI release for web + desktop. */
export async function GET(request: Request) {
  const latest = await fetchLatestRelease();
  if (!latest) {
    return NextResponse.json({ error: "Latest release unavailable" }, { status: 503 });
  }

  const url = new URL(request.url);
  const currentRaw = url.searchParams.get("current")?.trim();
  const currentVersion = currentRaw ? normalizeVersion(currentRaw) : null;
  const updateAvailable =
    currentVersion !== null && isVersionNewer(latest.latestVersion, currentVersion);

  return NextResponse.json({
    ...latest,
    currentVersion,
    updateAvailable,
  });
}
