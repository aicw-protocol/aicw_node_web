import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listNodeRewards } from "@/lib/db/nodeRewards";

export const revalidate = 45;

const SHARED_CACHE_CONTROL =
  "public, s-maxage=45, stale-while-revalidate=60";

/**
 * GET /api/node-rewards
 *
 * SOL rewards earned by nodes for referred wallet issuances across the network.
 */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  try {
    const data = await listNodeRewards();
    return NextResponse.json(data, {
      headers: { "Cache-Control": SHARED_CACHE_CONTROL },
    });
  } catch (error) {
    console.error("GET /api/node-rewards failed:", error);
    return NextResponse.json(
      { error: "Failed to load node rewards" },
      { status: 500 },
    );
  }
}
