import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Deprecation: "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** @deprecated Use /api/rewards/config and /api/rewards/committee instead. */
export async function GET() {
  return NextResponse.json(
    {
      available: false,
      reason: "deprecated",
      message:
        "Random referral node selection is retired. Wallet issuance uses MPC committee rewards via /api/rewards/wallet-issued.",
    },
    { status: 410, headers: corsHeaders },
  );
}
