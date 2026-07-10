import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { deleteNodeByOwner } from "@/lib/db/nodes";
import { removeNodeFromMembershipWhitelist } from "@/lib/consul/membershipWhitelist";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { nodeId: string };
}

/**
 * DELETE /api/nodes/:nodeId?wallet=...
 * Remove a node registration owned by the given wallet.
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
    const deleted = await deleteNodeByOwner({ nodeId, ownerWallet: wallet });

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
