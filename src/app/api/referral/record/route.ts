import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { recordWalletOpen } from "@/lib/db/referral";
import { NODE_FEE_SOL } from "@/lib/referralConfig";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

interface RecordRequest {
  nodeId: string;
  txSignature?: string;
  aicwWalletPda?: string;
  issuerPubkey?: string;
}

/**
 * POST /api/referral/record
 * 
 * Record a successful wallet issuance that went through a referral node.
 * This increments the node's referral_wallet_opens and adds NODE_FEE_SOL to reward_sol.
 * 
 * Request body:
 * {
 *   nodeId: string;         // The referral node ID
 *   txSignature?: string;   // The wallet issuance transaction signature
 *   aicwWalletPda?: string; // The created AICW wallet PDA
 *   issuerPubkey?: string;  // The issuer's public key
 * }
 * 
 * Response:
 * - On success: { success: true, recorded: true }
 * - If node not found: { success: true, recorded: false, reason: "node_not_found" }
 * - On error: { success: false, error: "..." }
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503, headers: corsHeaders },
    );
  }

  let body: RecordRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { nodeId, txSignature, aicwWalletPda, issuerPubkey } = body;

  if (!nodeId || typeof nodeId !== "string" || !nodeId.trim()) {
    return NextResponse.json(
      { success: false, error: "nodeId is required" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const recorded = await recordWalletOpen({
      nodeId: nodeId.trim(),
      rewardSol: NODE_FEE_SOL,
      txSignature,
      aicwWalletPda,
    });

    if (!recorded) {
      console.warn(
        `[referral/record] Node not found or inactive: ${nodeId}`,
        { txSignature, aicwWalletPda, issuerPubkey },
      );
      return NextResponse.json(
        {
          success: true,
          recorded: false,
          reason: "node_not_found",
        },
        { headers: corsHeaders },
      );
    }

    console.log(
      `[referral/record] Recorded wallet open for node ${nodeId}`,
      { txSignature, aicwWalletPda, issuerPubkey, rewardSol: NODE_FEE_SOL },
    );

    return NextResponse.json(
      {
        success: true,
        recorded: true,
        nodeId,
        rewardSol: NODE_FEE_SOL,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[referral/record] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
