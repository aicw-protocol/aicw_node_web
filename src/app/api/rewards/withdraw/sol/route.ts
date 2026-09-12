import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  finalizeSolWithdrawal,
  previewSolWithdrawal,
} from "@/lib/db/rewards";
import { rewardCorsHeaders } from "@/lib/rewardCors";
import { verifyWithdrawAuth } from "@/lib/rewardWithdrawAuth";
import { sendStakeReturn } from "@/lib/returnStake";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: rewardCorsHeaders });
}

interface Body {
  ownerWallet: string;
  nodeId?: string;
  challengeToken?: string;
  signatureBase64?: string;
  signedMessageBase64?: string;
  message?: string;
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

  const ownerWallet = body.ownerWallet?.trim();
  if (!ownerWallet) {
    return NextResponse.json(
      { success: false, error: "ownerWallet is required" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }

  try {
    new PublicKey(ownerWallet);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid ownerWallet" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }

  try {
    await verifyWithdrawAuth("withdraw_sol", {
      ownerWallet,
      challengeToken: body.challengeToken,
      signatureBase64: body.signatureBase64,
      signedMessageBase64: body.signedMessageBase64,
      message: body.message,
    });

    const preview = await previewSolWithdrawal({
      ownerWallet,
      nodeId: body.nodeId?.trim(),
    });

    const txSignature = await sendStakeReturn({
      recipientWallet: ownerWallet,
      amountSol: preview.amountSol,
    });

    const withdrawalId = await finalizeSolWithdrawal({
      ownerWallet,
      allocations: preview.allocations,
      chainTxSignature: txSignature,
    });

    return NextResponse.json(
      {
        success: true,
        amountSol: preview.amountSol,
        txSignature,
        withdrawalId,
      },
      { headers: rewardCorsHeaders },
    );
  } catch (error) {
    console.error("[rewards/withdraw/sol]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: rewardCorsHeaders },
    );
  }
}
