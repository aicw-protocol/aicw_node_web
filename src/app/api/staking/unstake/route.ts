import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { countNodesByOwner } from "@/lib/db/nodes";
import { requestUnstakeForWallet } from "@/lib/db/staking";
import { logUnstakeEvent } from "@/lib/db/unstakeEvents";
import { UNSTAKE_COOLDOWN_HOURS } from "@/lib/unstakeConstants";

export const dynamic = "force-dynamic";

/**
 * POST /api/staking/unstake
 * Wallet-level unstake request. Requires zero registered nodes.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  let body: { wallet?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = body.wallet?.trim();
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const remaining = await countNodesByOwner(wallet);
    if (remaining > 0) {
      return NextResponse.json(
        {
          error: `Remove all registered nodes before requesting unstake (${remaining} remain).`,
        },
        { status: 400 },
      );
    }

    const stake = await requestUnstakeForWallet({ wallet });
    await logUnstakeEvent({
      stakingId: stake.id,
      wallet,
      eventType: "unstake_requested",
      detail: `Unstake requested from web staking page; ${UNSTAKE_COOLDOWN_HOURS}h wait applies`,
    });
    await logUnstakeEvent({
      stakingId: stake.id,
      wallet,
      eventType: "return_scheduled",
      detail: stake.returnAvailableAt
        ? `Return available at ${stake.returnAvailableAt}`
        : null,
    });

    return NextResponse.json({ stake });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to request unstake";
    console.error("POST /api/staking/unstake failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
