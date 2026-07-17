import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getGuiWalletStatus } from "@/lib/guiStatus";

export const dynamic = "force-dynamic";

/** GET /api/gui/status?wallet= — wallet eligibility + node state for the desktop GUI. */
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
    return NextResponse.json(
      { error: "wallet query parameter is required" },
      { status: 400 },
    );
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const status = await getGuiWalletStatus(wallet);
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/gui/status failed:", error);
    return NextResponse.json(
      { error: "Failed to load GUI wallet status" },
      { status: 500 },
    );
  }
}
