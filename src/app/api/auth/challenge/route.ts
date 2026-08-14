import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  createGuiAuthChallenge,
  isGuiAuthPurpose,
  type GuiAuthPurpose,
} from "@/lib/guiAuth";

export const dynamic = "force-dynamic";

const NODE_SCOPED_PURPOSES: GuiAuthPurpose[] = [
  "register",
  "offboard",
  "delete_node",
];

/** GET /api/auth/challenge?wallet= — issue a short-lived signed-action challenge. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();
  const purposeParam = searchParams.get("purpose")?.trim() ?? "login";
  const purpose: GuiAuthPurpose = isGuiAuthPurpose(purposeParam)
    ? purposeParam
    : "login";
  const nodeId = searchParams.get("nodeId")?.trim();
  const nodeName = searchParams.get("nodeName")?.trim();
  const publicKey = searchParams.get("publicKey")?.trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet query parameter is required" }, { status: 400 });
  }

  if (NODE_SCOPED_PURPOSES.includes(purpose) && !nodeId) {
    return NextResponse.json(
      { error: "nodeId query parameter is required for this challenge" },
      { status: 400 },
    );
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const challenge = createGuiAuthChallenge(wallet, {
      purpose,
      nodeId,
      nodeName,
      publicKey,
    });
    return NextResponse.json(challenge);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create challenge";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
