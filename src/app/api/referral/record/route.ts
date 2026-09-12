import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Deprecation: "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** @deprecated Use POST /api/rewards/wallet-issued instead. */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      recorded: false,
      reason: "deprecated",
      message:
        "Referral SOL recording is retired. Use POST /api/rewards/wallet-issued for MPC committee rewards.",
    },
    { status: 410, headers: corsHeaders },
  );
}
