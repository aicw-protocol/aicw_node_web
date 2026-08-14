import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { findNodeById } from "@/lib/db/nodes";
import { updateNodePing } from "@/lib/db/referral";
import { resolvePingGeoFromRequest } from "@/lib/geo/resolvePingGeo";
import { verifyNodePingSignature } from "@/lib/nodePingAuth";

interface PingRequest {
  nodeId: string;
  timestamp: string;
  signatureBase64: string;
}

/**
 * POST /api/nodes/ping
 *
 * Update a node's last-ping timestamp to signal it is alive.
 * Requires an Ed25519 signature from the registered node key.
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

  const nodeId = body.nodeId?.trim();
  const timestamp = body.timestamp?.trim();
  const signatureBase64 = body.signatureBase64?.trim();

  if (!nodeId) {
    return NextResponse.json(
      { success: false, error: "nodeId is required" },
      { status: 400 },
    );
  }

  if (!timestamp || !signatureBase64) {
    return NextResponse.json(
      {
        success: false,
        error: "timestamp and signatureBase64 are required",
      },
      { status: 400 },
    );
  }

  try {
    const node = await findNodeById(nodeId);
    if (!node || node.status !== "registered") {
      return NextResponse.json(
        {
          success: false,
          error: "Node not found or not registered",
        },
        { status: 404 },
      );
    }

    if (!node.publicKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Node public key is not registered; re-register the node",
        },
        { status: 403 },
      );
    }

    const verified = await verifyNodePingSignature({
      nodeId,
      timestamp,
      signatureBase64,
      publicKeyHex: node.publicKey,
    });

    if (!verified.ok) {
      return NextResponse.json(
        { success: false, error: verified.error },
        { status: 401 },
      );
    }

    const geo = await resolvePingGeoFromRequest(request);
    const updated = await updateNodePing(nodeId, geo);

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "Node not found or not registered",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      nodeId,
      timestamp: new Date().toISOString(),
      locationUpdated: geo !== null,
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
