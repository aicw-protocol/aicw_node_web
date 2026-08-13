import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { isTreasuryReturnConfigured } from "@/lib/returnStake";
import { isStakingTreasuryConfigured } from "@/lib/stakingConfig";

export const dynamic = "force-dynamic";

/** GET /api/cron/unstake-health — readiness check (no secrets exposed). */
export async function GET() {
  return NextResponse.json({
    databaseConfigured: isDatabaseConfigured(),
    treasuryWalletConfigured: isStakingTreasuryConfigured(),
    treasuryReturnConfigured: isTreasuryReturnConfigured(),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    adminSecretConfigured: Boolean(process.env.ADMIN_SECRET?.trim()),
  });
}
