import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getOffboardStatus } from "@/lib/offboard";
import { listUnstakeEventsByWallet } from "@/lib/db/unstakeEvents";

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
    const [status, events] = await Promise.all([
      getOffboardStatus(wallet),
      listUnstakeEventsByWallet(wallet, 30),
    ]);
    return NextResponse.json({ ...status, events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load offboard status";
    console.error("GET /api/offboard/status failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
