import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { countNodesByOwner } from "@/lib/db/nodes";
import { requestUnstakeForWallet } from "@/lib/db/staking";
import { logUnstakeEvent } from "@/lib/db/unstakeEvents";
import { UNSTAKE_COOLDOWN_HOURS } from "@/lib/unstakeConstants";
import { verifyWalletActionSignature } from "@/lib/guiAuth";

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

  let body: {
    wallet?: string;
    challengeToken?: string;
    signatureBase64?: string;
    signedMessageBase64?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = body.wallet?.trim();
  const challengeToken = body.challengeToken?.trim();
  const signatureBase64 = body.signatureBase64?.trim();
  const signedMessageBase64 = body.signedMessageBase64?.trim();
  const message = body.message;

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  if (!challengeToken || !signatureBase64 || !message) {
    return NextResponse.json(
      {
        error:
          "challengeToken, signatureBase64, and message are required to request unstake",
      },
      { status: 400 },
    );
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  let ownerWallet: string;
  try {
    const verified = await verifyWalletActionSignature({
      challengeToken,
      wallet,
      signatureBase64,
      signedMessageBase64,
      message,
      expectedPurpose: "unstake",
    });

    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    ownerWallet = verified.wallet;
  } catch (error) {
    console.error("POST /api/staking/unstake signature verification failed:", error);
    return NextResponse.json(
      { error: "Wallet signature verification failed" },
      { status: 500 },
    );
  }

  try {
    const remaining = await countNodesByOwner(ownerWallet);
    if (remaining > 0) {
      return NextResponse.json(
        {
          error: `Remove all registered nodes before requesting unstake (${remaining} remain).`,
        },
        { status: 400 },
      );
    }

    const stake = await requestUnstakeForWallet({ wallet: ownerWallet });
    await logUnstakeEvent({
      stakingId: stake.id,
      wallet: ownerWallet,
      eventType: "unstake_requested",
      detail: `Unstake requested from web staking page; ${UNSTAKE_COOLDOWN_HOURS}h wait applies`,
    });
    await logUnstakeEvent({
      stakingId: stake.id,
      wallet: ownerWallet,
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
