import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { recordMpcEvent, recordMpcEventForCommittee } from "@/lib/db/rewards";
import {
  MPC_REWARD_EVENT_TYPES,
  type MpcRewardEventType,
} from "@/lib/rewardConfig";
import { rewardCorsHeaders } from "@/lib/rewardCors";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: rewardCorsHeaders });
}

interface Body {
  nodeId?: string;
  eventType: MpcRewardEventType;
  walletId?: string;
  txSignature?: string;
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

  const nodeId = body.nodeId?.trim();
  const walletId = body.walletId?.trim();
  const eventType = body.eventType;
  if (!nodeId && !walletId) {
    return NextResponse.json(
      { success: false, error: "nodeId or walletId is required" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }
  if (!MPC_REWARD_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json(
      { success: false, error: "Invalid eventType" },
      { status: 400, headers: rewardCorsHeaders },
    );
  }

  try {
    if (walletId && !nodeId) {
      const result = await recordMpcEventForCommittee({
        walletId,
        eventType,
        txSignature: body.txSignature,
      });

      return NextResponse.json(
        {
          success: true,
          recorded: result.credited.length > 0,
          credited: result.credited,
          skipped: result.skipped,
          walletId,
          eventType,
        },
        { headers: rewardCorsHeaders },
      );
    }

    const recorded = await recordMpcEvent({
      nodeId: nodeId!,
      eventType,
      walletId: body.walletId,
      txSignature: body.txSignature,
    });

    return NextResponse.json(
      { success: true, recorded, nodeId, eventType },
      { headers: rewardCorsHeaders },
    );
  } catch (error) {
    console.error("[rewards/mpc-event]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: rewardCorsHeaders },
    );
  }
}
