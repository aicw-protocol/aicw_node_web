import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { selectReferralNode, countActiveNodes } from "@/lib/db/referral";
import { NODE_FEE_SOL, NODE_FEE_LAMPORTS } from "@/lib/referralConfig";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/referral/select
 * 
 * Select a random active node for referral during wallet issuance.
 * Returns the node's owner wallet address for receiving the node fee.
 * 
 * Response:
 * - If node available:
 *   { available: true, nodeId, ownerWallet, feeSol, feeLamports }
 * - If no active nodes:
 *   { available: false, reason: "no_active_nodes" }
 * - If DB not configured:
 *   { available: false, reason: "db_not_configured" }
 */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        available: false,
        reason: "db_not_configured",
        feeSol: NODE_FEE_SOL,
        feeLamports: NODE_FEE_LAMPORTS,
      },
      { status: 200, headers: corsHeaders },
    );
  }

  try {
    const node = await selectReferralNode();

    if (!node) {
      return NextResponse.json(
        {
          available: false,
          reason: "no_active_nodes",
          activeNodeCount: 0,
          feeSol: NODE_FEE_SOL,
          feeLamports: NODE_FEE_LAMPORTS,
        },
        { headers: corsHeaders },
      );
    }

    const activeCount = await countActiveNodes();

    return NextResponse.json(
      {
        available: true,
        nodeId: node.nodeId,
        ownerWallet: node.ownerWallet,
        activeNodeCount: activeCount,
        feeSol: NODE_FEE_SOL,
        feeLamports: NODE_FEE_LAMPORTS,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[referral/select] Error:", error);
    return NextResponse.json(
      {
        available: false,
        reason: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
