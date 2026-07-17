import { NextResponse } from "next/server";
import { verifyGuiWalletSignature } from "@/lib/guiAuth";

export const dynamic = "force-dynamic";

/** POST /api/auth/verify — verify a Solana wallet signature for GUI login. */
export async function POST(request: Request) {
  let body: {
    challengeToken?: string;
    wallet?: string;
    signatureBase64?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const challengeToken = body.challengeToken?.trim();
  const wallet = body.wallet?.trim();
  const signatureBase64 = body.signatureBase64?.trim();
  const message = body.message;

  if (!challengeToken || !wallet || !signatureBase64 || !message) {
    return NextResponse.json(
      { error: "challengeToken, wallet, signatureBase64, and message are required" },
      { status: 400 },
    );
  }

  const result = await verifyGuiWalletSignature({
    challengeToken,
    wallet,
    signatureBase64,
    message,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  return NextResponse.json({
    wallet: result.wallet,
    verified: true,
  });
}
