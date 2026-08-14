import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { deleteNodeByOwner } from "@/lib/db/nodes";
import { removeNodeFromMembershipWhitelist } from "@/lib/consul/membershipWhitelist";
import { verifyWalletActionSignature } from "@/lib/guiAuth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { nodeId: string };
}

/**
 * DELETE /api/nodes/:nodeId
 * Remove a node registration owned by the signed wallet.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const nodeId = params.nodeId?.trim();
  if (!nodeId) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  let body: {
    wallet?: string;
    challengeToken?: string;
    signatureBase64?: string;
    signedMessageBase64?: string;
    message?: string;
  } = {};

  try {
    body = (await request.json()) as typeof body;
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
          "challengeToken, signatureBase64, and message are required to delete a node",
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
      expectedPurpose: "delete_node",
      nodeId,
    });

    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    ownerWallet = verified.wallet;
  } catch (error) {
    console.error("DELETE /api/nodes signature verification failed:", error);
    return NextResponse.json(
      { error: "Wallet signature verification failed" },
      { status: 500 },
    );
  }

  try {
    const deleted = await deleteNodeByOwner({ nodeId, ownerWallet });

    if (!deleted) {
      return NextResponse.json(
        { error: "Node not found or not owned by this wallet" },
        { status: 404 },
      );
    }

    try {
      await removeNodeFromMembershipWhitelist(nodeId);
    } catch (whitelistError) {
      console.error("DELETE /api/nodes consul cleanup failed:", whitelistError);
    }

    return NextResponse.json({ success: true, nodeId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete node";
    console.error("DELETE /api/nodes/[nodeId] failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
