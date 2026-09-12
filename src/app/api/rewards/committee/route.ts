import { NextRequest, NextResponse } from "next/server";
import { resolveWalletIssuanceCommittee } from "@/lib/db/rewards";
import { rewardCorsHeaders } from "@/lib/rewardCors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: rewardCorsHeaders });
}

export async function GET(request: NextRequest) {
  const walletId = new URL(request.url).searchParams.get("walletId")?.trim();
  if (!walletId) {
    return NextResponse.json(
      { error: "walletId is required" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }

  try {
    const committeeNodeIds = await resolveWalletIssuanceCommittee(walletId);
    return NextResponse.json(
      { walletId, committeeNodeIds, count: committeeNodeIds.length },
      { headers: rewardCorsHeaders },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to resolve committee",
      },
      { status: 500, headers: rewardCorsHeaders },
    );
  }
}
