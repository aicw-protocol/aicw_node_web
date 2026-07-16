import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { PING_MAX_AGE_MS } from "@/lib/referralConfig";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface ActiveNodeRow extends RowDataPacket {
  node_id: string;
}

/**
 * GET /api/nodes/active
 *
 * Bulk liveness endpoint for the reshare orchestrator (auto_reshare_design.md
 * §9.2): returns every node whose last ping is within PING_MAX_AGE_MS. This
 * avoids the N+1 pattern of polling /api/nodes/status per node.
 *
 * Response: { active: string[], maxAgeMs: number }
 */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  try {
    const cutoff = new Date(Date.now() - PING_MAX_AGE_MS);
    const pool = await getPool();
    const [rows] = await pool.query<ActiveNodeRow[]>(
      "SELECT node_id FROM nodes WHERE last_ping_at IS NOT NULL AND last_ping_at >= :cutoff",
      { cutoff },
    );

    const active = rows.map((r) => r.node_id).filter((id) => !!id);

    return NextResponse.json({ active, maxAgeMs: PING_MAX_AGE_MS });
  } catch (error) {
    console.error("GET /api/nodes/active failed:", error);
    return NextResponse.json(
      { error: "Failed to list active nodes" },
      { status: 500 },
    );
  }
}
