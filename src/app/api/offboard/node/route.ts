import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { offboardNode } from "@/lib/offboard";
import { verifyWalletActionSignature } from "@/lib/guiAuth";

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

  let body: {
    wallet?: string;
    nodeId?: string;
    nodeName?: string;
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
  const nodeId = body.nodeId?.trim();
  const nodeName = body.nodeName?.trim();
  const challengeToken = body.challengeToken?.trim();
  const signatureBase64 = body.signatureBase64?.trim();
  const signedMessageBase64 = body.signedMessageBase64?.trim();
  const message = body.message;

  if (!wallet || !nodeId) {
    return NextResponse.json(
      { error: "wallet and nodeId are required" },
      { status: 400 },
    );
  }

  if (!challengeToken || !signatureBase64 || !message) {
    return NextResponse.json(
      {
        error:
          "challengeToken, signatureBase64, and message are required to offboard a node",
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
      expectedPurpose: "offboard",
      nodeId,
      nodeName,
    });

    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    ownerWallet = verified.wallet;
  } catch (error) {
    console.error("POST /api/offboard/node signature verification failed:", error);
    return NextResponse.json(
      { error: "Wallet signature verification failed" },
      { status: 500 },
    );
  }

  try {
    const result = await offboardNode({
      wallet: ownerWallet,
      nodeId,
      nodeName,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to offboard node";
    console.error("POST /api/offboard/node failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
