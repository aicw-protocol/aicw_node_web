import { NextResponse } from "next/server";
import { getOnboardingConfig } from "@/lib/onboardingConfig";

export const dynamic = "force-dynamic";

/** GET /api/onboarding/config — public settings for the Create Node flow. */
export async function GET() {
  return NextResponse.json(getOnboardingConfig());
}
