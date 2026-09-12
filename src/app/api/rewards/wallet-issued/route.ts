import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { recordWalletIssuance } from "@/lib/db/rewards";
import { rewardCorsHeaders } from "@/lib/rewardCors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: rewardCorsHeaders });
}

interface Body {
  walletId: string;
  txSignature?: string;
  aicwWalletPda?: string;
  issuerPubkey?: string;
  committeeNodeIds?: string[];
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503, headers: rewardCorsHeaders },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }

  const walletId = body.walletId?.trim();
  if (!walletId) {
    return NextResponse.json(
      { success: false, error: "walletId is required" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }

  try {
    const result = await recordWalletIssuance({
      walletId,
      txSignature: body.txSignature,
      aicwWalletPda: body.aicwWalletPda,
      committeeNodeIds: body.committeeNodeIds,
    });

    return NextResponse.json(
      {
        success: true,
        recorded: true,
        walletId,
        committeeNodeIds: result.committeeNodeIds,
        perNodeSol: result.perNodeSol,
      },
      { headers: rewardCorsHeaders },
    );
  } catch (error) {
    console.error("[rewards/wallet-issued]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: rewardCorsHeaders },
    );
  }
}
