import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createGuiAuthChallenge } from "@/lib/guiAuth";

export const dynamic = "force-dynamic";

/** GET /api/auth/challenge?wallet= — issue a short-lived GUI login challenge. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();
  const purpose = searchParams.get("purpose")?.trim() === "register" ? "register" : "login";
  const nodeId = searchParams.get("nodeId")?.trim();
  const nodeName = searchParams.get("nodeName")?.trim();
  const publicKey = searchParams.get("publicKey")?.trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet query parameter is required" }, { status: 400 });
  }

  if (purpose === "register" && !nodeId) {
    return NextResponse.json(
      { error: "nodeId query parameter is required for registration challenges" },
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
