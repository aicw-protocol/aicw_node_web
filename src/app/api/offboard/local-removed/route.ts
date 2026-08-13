import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { logUnstakeEvent } from "@/lib/db/unstakeEvents";

export const dynamic = "force-dynamic";

/** POST /api/offboard/local-removed — GUI reports local identity cleanup. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  let body: { wallet?: string; nodeId?: string; nodeName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = body.wallet?.trim();
  const nodeId = body.nodeId?.trim();
  const nodeName = body.nodeName?.trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const event = await logUnstakeEvent({
      wallet,
      nodeId: nodeId || null,
      nodeName: nodeName || null,
      eventType: "local_identity_removed",
      detail: "Local identity, DB, and pid files removed by desktop GUI",
    });
    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to log local removal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
