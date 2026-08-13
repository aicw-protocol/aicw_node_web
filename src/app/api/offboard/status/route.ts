import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getOffboardStatus, processDueUnstakeReturns } from "@/lib/offboard";
import { listUnstakeEventsByWallet } from "@/lib/db/unstakeEvents";
import { isTreasuryReturnConfigured } from "@/lib/returnStake";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    let status = await getOffboardStatus(wallet);

    // Best-effort: if return is due and treasury is configured, process now
    // (cron remains the primary production path).
    if (status.isReturnDue && isTreasuryReturnConfigured()) {
      try {
        await processDueUnstakeReturns();
        status = await getOffboardStatus(wallet);
      } catch (processError) {
        console.error("GET /api/offboard/status auto-return failed:", processError);
      }
    }

    const events = await listUnstakeEventsByWallet(wallet, 30);
    return NextResponse.json({ ...status, events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load offboard status";
    console.error("GET /api/offboard/status failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
