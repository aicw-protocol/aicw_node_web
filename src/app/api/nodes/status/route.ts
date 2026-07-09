import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { PING_MAX_AGE_MS } from "@/lib/referralConfig";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface NodeStatusRow extends RowDataPacket {
  last_ping_at: Date | null;
}

/**
 * GET /api/nodes/status?nodeId=xxx
 * Returns whether a node is "active" (has recent ping).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("nodeId")?.trim();

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  try {
    const pool = await getPool();
    const [rows] = await pool.query<NodeStatusRow[]>(
      "SELECT last_ping_at FROM nodes WHERE node_id = :nodeId LIMIT 1",
      { nodeId },
    );

    if (!rows[0]) {
      return NextResponse.json({ active: false, reason: "not_found" });
    }

    const lastPing = rows[0].last_ping_at;
    if (!lastPing) {
      return NextResponse.json({ active: false, reason: "no_ping" });
    }

    const pingAge = Date.now() - lastPing.getTime();
    const active = pingAge <= PING_MAX_AGE_MS;

    return NextResponse.json({ active, lastPingAt: lastPing.toISOString() });
  } catch (error) {
    console.error("GET /api/nodes/status failed:", error);
    return NextResponse.json(
      { error: "Failed to check node status" },
      { status: 500 },
    );
  }
}
