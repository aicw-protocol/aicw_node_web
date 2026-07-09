import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Database is not configured" },
      { status: 503 },
    );
  }

  try {
    const pool = await getPool();
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, configured: true });
  } catch (error) {
    console.error("GET /api/health/db failed:", error);
    return NextResponse.json(
      { ok: false, configured: true, error: "Database connection failed" },
      { status: 500 },
    );
  }
}
