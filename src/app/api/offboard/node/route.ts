import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { offboardNode } from "@/lib/offboard";

export const dynamic = "force-dynamic";

/**
 * POST /api/offboard/node
 * Stop/offboard a single node: deregister, and if this was the last node,
 * begin the 72-hour unstake return process for the operator wallet.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  let body: { wallet?: string; nodeId?: string; nodeName?: string; processStopped?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = body.wallet?.trim();
  const nodeId = body.nodeId?.trim();
  const nodeName = body.nodeName?.trim();

  if (!wallet || !nodeId) {
    return NextResponse.json(
      { error: "wallet and nodeId are required" },
      { status: 400 },
    );
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const result = await offboardNode({
      wallet,
      nodeId,
      nodeName,
      processStopped: body.processStopped === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to offboard node";
    console.error("POST /api/offboard/node failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
