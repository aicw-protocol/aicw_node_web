import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { updateNodePing } from "@/lib/db/referral";

interface PingRequest {
  nodeId: string;
}

/**
 * POST /api/nodes/ping
 * 
 * Update a node's last-ping timestamp to signal it is alive.
 * Nodes should call this periodically (every 1-2 minutes).
 * 
 * Request body:
 * {
 *   nodeId: string;  // The node ID
 * }
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503 },
    );
  }

  let body: PingRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { nodeId } = body;

  if (!nodeId || typeof nodeId !== "string" || !nodeId.trim()) {
    return NextResponse.json(
      { success: false, error: "nodeId is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateNodePing(nodeId.trim());

    if (!updated) {
      return NextResponse.json({
        success: false,
        error: "Node not found or not registered",
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      nodeId: nodeId.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[nodes/ping] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
