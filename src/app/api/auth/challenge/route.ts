import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createGuiAuthChallenge } from "@/lib/guiAuth";

export const dynamic = "force-dynamic";

/** GET /api/auth/challenge?wallet= — issue a short-lived GUI login challenge. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();

  if (!wallet) {
    return NextResponse.json({ error: "wallet query parameter is required" }, { status: 400 });
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const challenge = createGuiAuthChallenge(wallet);
  return NextResponse.json(challenge);
}
