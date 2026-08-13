import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { processDueUnstakeReturns } from "@/lib/offboard";
import { isTreasuryReturnConfigured } from "@/lib/returnStake";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim();
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret")?.trim() === secret;
}

/**
 * POST /api/cron/process-unstake-returns
 * Sends SOL back to operator wallets whose 72-hour unstake waiting period has elapsed.
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  if (!isTreasuryReturnConfigured()) {
    return NextResponse.json(
      { error: "STAKING_TREASURY_SECRET_KEY is not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await processDueUnstakeReturns();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process returns";
    console.error("POST /api/cron/process-unstake-returns failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
